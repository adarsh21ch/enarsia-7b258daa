import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { formatTrackingValue } from '@/lib/snapshotSlotUtils';
import { format, parseISO } from 'date-fns';
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

  if (funnelPeriods.length === 0) {
    return <div className="text-center py-8 text-sm text-muted-foreground">No funnel data available. Set up your funnel start date first.</div>;
  }

  return (
    <div className="rounded-xl border border-border/50 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="text-xs" style={{ tableLayout: 'fixed', width: `${funnelPeriods.length * 100 + 90}px` }}>
          <colgroup>
            <col style={{ width: '90px' }} />
            {funnelPeriods.map((p) => (
              <col key={p.label} style={{ width: '100px' }} />
            ))}
          </colgroup>
          <thead>
            <tr className="bg-accent text-accent-foreground">
              <th className="sticky left-0 z-10 bg-accent text-accent-foreground px-2 py-2 text-left font-semibold whitespace-nowrap">Stage</th>
              {funnelPeriods.map((period, index) => (
                <th key={period.label} className="px-2 py-2 text-center font-semibold min-w-[80px]">
                  <div className="font-bold text-[11px]">Funnel {index + 1}</div>
                  <div className="text-[10px] text-accent-foreground/70 font-normal">({formatDateRange(period.startDate, period.endDate)})</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {stageTagNames.map((stageName) => (
              <tr key={stageName} className="border-t border-border/30">
                <td className="sticky left-0 z-10 bg-accent text-accent-foreground px-2 py-2 font-medium whitespace-nowrap overflow-hidden text-ellipsis">{stageName}</td>
                {funnelPeriods.map((period) => {
                  const val = period.stageTotals[stageName] ?? 0;
                  return (
                    <td key={period.label} className={cn('px-2 py-2 text-center', val > 0 ? 'text-foreground font-medium' : 'text-muted-foreground')}>
                      {formatTrackingValue(val)}
                    </td>
                  );
                })}
              </tr>
            ))}
            <PersonalTagExpandableRows
              tagNames={personalTagData?.tagNames ?? []}
              tagRows={personalTagRows}
              columnCount={funnelPeriods.length}
            />
          </tbody>
        </table>
      </div>
    </div>
  );
}
