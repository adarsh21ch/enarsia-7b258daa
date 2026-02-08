import { cn } from '@/lib/utils';
import { formatTrackingValue } from '@/lib/snapshotSlotUtils';
import { format, parseISO } from 'date-fns';
import type { FunnelPeriod } from '@/hooks/useSnapshotV2ComputedData';

function formatDateRange(startDate: string, endDate: string): string {
  const s = parseISO(startDate);
  const e = parseISO(endDate);
  const sMonth = format(s, 'MMM');
  const eMonth = format(e, 'MMM');
  if (sMonth === eMonth) {
    return `${format(s, 'd')}-${format(e, 'd')} ${sMonth}`;
  }
  return `${format(s, 'd')} ${sMonth} - ${format(e, 'd')} ${eMonth}`;
}

interface FunnelWiseTableProps {
  funnelPeriods: FunnelPeriod[];
  stageTagNames: string[];
  finalTagName: string | null;
}

/**
 * Funnel-wise table for Funnels mode.
 * Stage tags as sticky left column, funnel periods as horizontal columns.
 */
export function FunnelWiseTable({
  funnelPeriods,
  stageTagNames,
  finalTagName,
}: FunnelWiseTableProps) {
  if (funnelPeriods.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-muted-foreground">
        No funnel data available. Set up your funnel start date first.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border/50 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-max min-w-full text-xs">
          <thead>
            <tr className="bg-accent text-accent-foreground">
              <th className="sticky left-0 z-10 bg-accent text-accent-foreground px-3 py-2 text-left font-semibold min-w-[100px]">
                Stage
              </th>
              {funnelPeriods.map((period, index) => (
                <th
                  key={period.label}
                  className="px-3 py-2 text-center font-semibold min-w-[90px]"
                >
                  <div className="font-bold text-[11px]">Funnel {index + 1}</div>
                  <div className="text-[10px] text-accent-foreground/70 font-normal">
                    ({formatDateRange(period.startDate, period.endDate)})
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {stageTagNames.map((stageName) => (
              <tr key={stageName} className="border-t border-border/30">
                <td className="sticky left-0 z-10 bg-accent text-accent-foreground px-3 py-2 font-medium whitespace-nowrap">
                  {stageName}
                </td>
                {funnelPeriods.map((period) => {
                  const val = period.stageTotals[stageName] ?? 0;
                  return (
                    <td
                      key={period.label}
                      className={cn(
                        'px-3 py-2 text-center',
                        val > 0
                          ? 'text-foreground font-medium'
                          : 'text-muted-foreground'
                      )}
                    >
                      {formatTrackingValue(val)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
