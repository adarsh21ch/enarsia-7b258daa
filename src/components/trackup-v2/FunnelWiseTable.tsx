import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { formatTrackingValue } from '@/lib/snapshotSlotUtils';
import type { FunnelPeriod } from '@/hooks/useSnapshotV2ComputedData';

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
              {funnelPeriods.map((period) => (
                <th
                  key={period.label}
                  className="px-3 py-2 text-center font-semibold min-w-[64px]"
                >
                  <div className="font-bold">{period.label}</div>
                  <div className="text-[10px] text-accent-foreground/70 font-normal">
                    {period.startDate.slice(5)}
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
