import { useRef, useEffect, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { formatTrackingValue } from '@/lib/snapshotSlotUtils';
import { format, parseISO, isWithinInterval } from 'date-fns';
import { PersonalTagExpandableRows } from './PersonalTagExpandableRows';
import type { FunnelPeriod } from '@/hooks/useSnapshotV2ComputedData';
import type { PersonalTagData } from '@/hooks/usePersonalTagMetrics';

function formatDateRange(startDate: string, endDate: string): string {
  const s = parseISO(startDate);
  const e = parseISO(endDate);
  const sMonth = format(s, 'MMM');
  const eMonth = format(e, 'MMM');
  if (sMonth === eMonth) return `${format(s, 'd')}-${format(e, 'd')} ${sMonth}`;
  return `${format(s, 'd')} ${sMonth} - ${format(e, 'd')} ${eMonth}`;
}

interface FunnelWiseTableProps {
  funnelPeriods: FunnelPeriod[];
  stageTagNames: string[];
  finalTagName: string | null;
  personalTagData?: PersonalTagData;
}

export function FunnelWiseTable({
  funnelPeriods,
  stageTagNames,
  finalTagName,
  personalTagData,
}: FunnelWiseTableProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to current funnel period
  useEffect(() => {
    if (!scrollRef.current || funnelPeriods.length === 0) return;
    const today = format(new Date(), 'yyyy-MM-dd');
    const currentIdx = funnelPeriods.findIndex((p) =>
      today >= p.startDate && today <= p.endDate
    );
    if (currentIdx >= 0) {
      const colWidth = 100;
      const stickyCol = 90;
      const containerWidth = scrollRef.current.clientWidth;
      scrollRef.current.scrollLeft = Math.max(0, currentIdx * colWidth - (containerWidth - stickyCol) / 2);
    }
  }, [funnelPeriods]);

  // Aggregate personal tag daily data into funnel period buckets
  const personalTagRows = useMemo(() => {
    if (!personalTagData || personalTagData.tagNames.length === 0 || funnelPeriods.length === 0) return [];
    return personalTagData.tagNames.map((tag) => ({
      label: tag,
      values: funnelPeriods.map((period) => {
        let sum = 0;
        personalTagData.dailyMetrics.forEach((dm) => {
          if (dm.date >= period.startDate && dm.date <= period.endDate) {
            sum += dm.tagCounts[tag] ?? 0;
          }
        });
        return sum;
      }),
    }));
  }, [personalTagData, funnelPeriods]);

  // Compute stage totals across all funnel periods
  const stageTotalsAll = useMemo(() => {
    const totals: Record<string, number> = {};
    stageTagNames.forEach((name) => {
      totals[name] = funnelPeriods.reduce((sum, p) => sum + (p.stageTotals[name] ?? 0), 0);
    });
    return totals;
  }, [funnelPeriods, stageTagNames]);

  if (funnelPeriods.length === 0) {
    return <div className="text-center py-8 text-sm text-muted-foreground">No funnel data available. Set up your funnel start date first.</div>;
  }

  return (
    <div className="rounded-xl border border-border/50 overflow-hidden">
      <div ref={scrollRef} className="overflow-x-auto">
        <table className="text-xs" style={{ tableLayout: 'fixed', width: `${funnelPeriods.length * 100 + 90 + 52}px` }}>
          <colgroup>
            <col style={{ width: '90px' }} />
            {funnelPeriods.map((p) => (
              <col key={p.label} style={{ width: '100px' }} />
            ))}
            <col style={{ width: '52px' }} />
          </colgroup>
          <thead>
            <tr className="bg-muted/60 border-b border-border">
              <th className="sticky left-0 z-10 bg-muted/60 text-muted-foreground px-2 py-2 text-left font-semibold whitespace-nowrap uppercase tracking-wider text-[10px]">Stage</th>
              {funnelPeriods.map((period, index) => (
                <th key={period.label} className="px-2 py-2 text-center font-semibold min-w-[80px] text-muted-foreground">
                  <div className="font-bold text-[11px]">Funnel {index + 1}</div>
                  <div className="text-[10px] opacity-70 font-normal">({formatDateRange(period.startDate, period.endDate)})</div>
                </th>
              ))}
              <th className="px-2 py-2 text-center font-semibold bg-muted text-foreground uppercase tracking-wider text-[10px]">Total</th>
            </tr>
          </thead>
          <tbody>
            {stageTagNames.map((stageName) => (
              <tr key={stageName} className="border-t border-border/40">
                <td className="sticky left-0 z-10 bg-card text-foreground px-2 py-2 font-medium whitespace-nowrap overflow-hidden text-ellipsis">{stageName}</td>
                {funnelPeriods.map((period) => {
                  const val = period.stageTotals[stageName] ?? 0;
                  return (
                    <td key={period.label} className={cn('px-2 py-2 text-center', val > 0 ? 'text-primary font-semibold' : 'text-muted-foreground/60')}>
                      {val > 0 ? formatTrackingValue(val) : '–'}
                    </td>
                  );
                })}
                <td className="px-2 py-2 text-center font-semibold bg-muted/70 text-foreground">
                  {formatTrackingValue(stageTotalsAll[stageName] ?? 0)}
                </td>
              </tr>
            ))}
            <PersonalTagExpandableRows
              tagNames={personalTagData?.tagNames ?? []}
              tagRows={personalTagRows}
              columnCount={funnelPeriods.length + 1}
            />
          </tbody>
        </table>
      </div>
    </div>
  );
}
