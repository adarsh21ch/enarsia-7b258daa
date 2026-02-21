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
  monthYear: string = '',
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

  // Daily metrics — generate ALL days of the month, fill gaps with zeros
  const dailyMetrics: DailyMetric[] = useMemo(() => {
    // Build a lookup from existing snapshots
    const snapMap = new Map<string, SnapshotRow>();
    snapshots.forEach((s) => snapMap.set(s.date, s));

    // Determine all days of the month
    let year: number, month: number, daysInMonth: number;
    if (monthYear && monthYear.match(/^\d{4}-\d{2}$/)) {
      [year, month] = monthYear.split('-').map(Number);
      daysInMonth = new Date(year, month, 0).getDate();
    } else if (snapshots.length > 0) {
      const first = parseISO(snapshots[0].date);
      year = first.getFullYear();
      month = first.getMonth() + 1;
      daysInMonth = new Date(year, month, 0).getDate();
    } else {
      return [];
    }

    const result: DailyMetric[] = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const d = parseISO(dateStr);
      const snap = snapMap.get(dateStr);
      result.push({
        date: dateStr,
        dateLabel: format(d, 'MMM dd'),
        dayOfWeek: format(d, 'EEE'),
        isToday: isToday(d),
        totalLeads: snap?.total_leads ?? 0,
        totalResponses: snap?.total_responses ?? 0,
        responseTags: snap?.response_tags ?? {},
        stageTags: snap?.stage_tags ?? {},
        finalTagCount: snap?.final_tag_count ?? 0,
        funnelTag: snap?.funnel_tag ?? null,
        funnelTagCount: snap?.funnel_tag_count ?? 0,
        funnelDay: snap?.funnel_day ?? null,
      });
    }
    return result;
  }, [snapshots, monthYear]);

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

  // Funnel periods (group daily metrics by funnel length, starting from the configured day-of-month)
  const funnelPeriods: FunnelPeriod[] = useMemo(() => {
    if (funnelLength <= 0 || dailyMetrics.length === 0) return [];

    // Default to 1st of viewing month when no funnel config exists
    const effectiveStartDate = funnelStartDate || `${dailyMetrics[0].date.substring(0, 8)}01`;

    // Extract the day-of-month from the leader's day_1_start config
    const configDay = parseISO(effectiveStartDate).getDate();

    // Determine the month we're viewing from the first snapshot
    const firstSnap = parseISO(dailyMetrics[0].date);
    const viewYear = firstSnap.getFullYear();
    const viewMonth = firstSnap.getMonth();

    // F1 starts on configDay of the viewing month
    const monthStart = new Date(viewYear, viewMonth, configDay);

    const buckets: Map<number, DailyMetric[]> = new Map();

    dailyMetrics.forEach((m) => {
      const daysSince = differenceInCalendarDays(parseISO(m.date), monthStart) + 1;
      if (daysSince < 1) return; // before funnel cycle starts this month
      const periodNum = Math.ceil(daysSince / funnelLength);
      if (!buckets.has(periodNum)) buckets.set(periodNum, []);
      buckets.get(periodNum)!.push(m);
    });

    const sortedKeys = Array.from(buckets.keys()).sort((a, b) => a - b);

    return sortedKeys.map((key, index) => {
      const days = buckets.get(key)!;
      const stageTotals: Record<string, number> = {};
      stageTagNames.forEach((name) => {
        stageTotals[name] = days.reduce(
          (sum, d) => sum + (d.stageTags[name] ?? 0),
          0
        );
      });
      return {
        label: `F${index + 1}`,
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
