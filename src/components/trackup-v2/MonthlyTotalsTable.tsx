import { cn } from '@/lib/utils';
import { formatTrackingValue } from '@/lib/snapshotSlotUtils';
import type { MonthlyTotals } from '@/hooks/useSnapshotV2ComputedData';

interface MonthlyTotalsTableProps {
  totals: MonthlyTotals;
  responseTagNames: string[];
  stageTagNames: string[];
  finalTagName: string | null;
  monthLabel: string; // e.g. "February 2026"
}

/**
 * Monthly totals table: one row with all tag columns.
 */
export function MonthlyTotalsTable({
  totals,
  responseTagNames,
  stageTagNames,
  finalTagName,
  monthLabel,
}: MonthlyTotalsTableProps) {
  const allTags = [
    { label: 'Leads', value: totals.totalLeads },
    { label: 'Responses', value: totals.totalResponses },
    ...responseTagNames.map((name) => ({
      label: name,
      value: totals.responseTagTotals[name] ?? 0,
    })),
    ...stageTagNames.map((name) => ({
      label: name,
      value: totals.stageTagTotals[name] ?? 0,
    })),
  ];

  return (
    <div className="rounded-xl border border-border/50 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 bg-accent text-accent-foreground px-3 py-2 text-left font-semibold min-w-[100px]">
                Month
              </th>
              {allTags.map((tag) => (
                <th key={tag.label} className="bg-accent text-accent-foreground px-3 py-2 text-center font-semibold">
                  {tag.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="border-t border-border/30">
              <td className="sticky left-0 z-10 bg-accent text-accent-foreground px-3 py-2 font-medium">
                {monthLabel}
              </td>
              {allTags.map((tag) => (
                <td
                  key={tag.label}
                  className={cn(
                    'px-3 py-2 text-center',
                    tag.value > 0
                      ? 'text-foreground font-medium'
                      : 'text-muted-foreground'
                  )}
                >
                  {formatTrackingValue(tag.value)}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
