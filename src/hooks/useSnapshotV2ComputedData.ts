import { useMemo } from 'react';
import { format, parseISO, isToday, differenceInCalendarDays } from 'date-fns';
import type { SnapshotRow } from '@/lib/snapshotSlotUtils';
import type { TrackingTag, StageTag } from '@/hooks/useTrackingFormat';

export interface DailyMetric {
  date: string;
  dateLabel: string; // "Feb 07"
  dayOfWeek: string; // "Fri"
  isToday: boolean;
  totalLeads: number;
  totalResponses: number;
  responseTags: Record<string, number>;
  stageTags: Record<string, number>;
  finalTagCount: number;
  funnelTag: string | null;
  funnelTagCount: number;
  funnelDay: number | null;
}

export interface MonthlyTotals {
  totalLeads: number;
  totalResponses: number;
  responseTagTotals: Record<string, number>;
  stageTagTotals: Record<string, number>;
  finalTagTotal: number;
}

export interface KPIData {
  totalLeads: number;
  totalResponses: number;
  responseTagTotals: Record<string, number>;
  stageTagTotals: Record<string, number>;
  finalTagTotal: number;
  finalTagName: string | null;
  daysWithData: number;
}

export interface FunnelPeriod {
  label: string; // "F1", "F2", ...
  startDate: string;
  endDate: string;
  days: DailyMetric[];
  stageTotals: Record<string, number>;
}

export function useSnapshotV2ComputedData(
  snapshots: SnapshotRow[],
  responseTrackingTags: TrackingTag[],
  stageTags: StageTag[],
  funnelLength: number = 3,
  funnelStartDate: string | null = null,
) {
  const responseTagNames = useMemo(
    () => responseTrackingTags.map((t) => t.name),
    [responseTrackingTags]
  );
  const stageTagNames = useMemo(
    () => stageTags.map((t) => t.name),
    [stageTags]
  );
  const finalTagName = useMemo(
    () => stageTags.find((t) => t.isFinalTarget)?.name ?? null,
    [stageTags]
  );

  // Daily metrics
  const dailyMetrics: DailyMetric[] = useMemo(() => {
    return snapshots.map((snap) => {
      const d = parseISO(snap.date);
      return {
        date: snap.date,
        dateLabel: format(d, 'MMM dd'),
        dayOfWeek: format(d, 'EEE'),
        isToday: isToday(d),
        totalLeads: snap.total_leads,
        totalResponses: snap.total_responses,
        responseTags: snap.response_tags,
        stageTags: snap.stage_tags,
        finalTagCount: snap.final_tag_count,
        funnelTag: snap.funnel_tag,
        funnelTagCount: snap.funnel_tag_count,
        funnelDay: snap.funnel_day,
      };
    });
  }, [snapshots]);

  // Monthly totals
  const monthlyTotals: MonthlyTotals = useMemo(() => {
    const totals: MonthlyTotals = {
      totalLeads: 0,
      totalResponses: 0,
      responseTagTotals: {},
      stageTagTotals: {},
      finalTagTotal: 0,
    };

    responseTagNames.forEach((n) => (totals.responseTagTotals[n] = 0));
    stageTagNames.forEach((n) => (totals.stageTagTotals[n] = 0));

    snapshots.forEach((snap) => {
      totals.totalLeads += snap.total_leads;
      totals.totalResponses += snap.total_responses;
      totals.finalTagTotal += snap.final_tag_count;

      responseTagNames.forEach((name) => {
        totals.responseTagTotals[name] += snap.response_tags[name] ?? 0;
      });
      stageTagNames.forEach((name) => {
        totals.stageTagTotals[name] += snap.stage_tags[name] ?? 0;
      });
    });

    return totals;
  }, [snapshots, responseTagNames, stageTagNames]);

  // KPI data
  const kpiData: KPIData = useMemo(
    () => ({
      ...monthlyTotals,
      finalTagName,
      daysWithData: snapshots.filter(
        (s) => s.total_leads > 0 || s.total_responses > 0
      ).length,
    }),
    [monthlyTotals, finalTagName, snapshots]
  );

  // Funnel periods (group daily metrics by funnel length using date arithmetic)
  const funnelPeriods: FunnelPeriod[] = useMemo(() => {
    if (!funnelStartDate || funnelLength <= 0) return [];

    const startD = parseISO(funnelStartDate);
    const buckets: Map<number, DailyMetric[]> = new Map();

    dailyMetrics.forEach((m) => {
      const daysSince = differenceInCalendarDays(parseISO(m.date), startD) + 1;
      if (daysSince < 1) return; // before funnel started
      const periodNum = Math.ceil(daysSince / funnelLength);
      if (!buckets.has(periodNum)) buckets.set(periodNum, []);
      buckets.get(periodNum)!.push(m);
    });

    const sortedKeys = Array.from(buckets.keys()).sort((a, b) => a - b);

    return sortedKeys.map((key) => {
      const days = buckets.get(key)!;
      const stageTotals: Record<string, number> = {};
      stageTagNames.forEach((name) => {
        stageTotals[name] = days.reduce(
          (sum, d) => sum + (d.stageTags[name] ?? 0),
          0
        );
      });
      return {
        label: `F${key}`,
        startDate: days[0].date,
        endDate: days[days.length - 1].date,
        days,
        stageTotals,
      };
    });
  }, [dailyMetrics, funnelLength, funnelStartDate, stageTagNames]);

  return {
    dailyMetrics,
    monthlyTotals,
    kpiData,
    funnelPeriods,
    responseTagNames,
    stageTagNames,
    finalTagName,
  };
}
