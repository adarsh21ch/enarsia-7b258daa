import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { formatTrackingValue } from '@/lib/snapshotSlotUtils';
import { PersonalTagExpandableRows } from './PersonalTagExpandableRows';
import type { MonthlyTotals } from '@/hooks/useSnapshotV2ComputedData';
import type { PersonalTagData } from '@/hooks/usePersonalTagMetrics';

interface MonthlyTotalsTableProps {
  totals: MonthlyTotals;
  responseTagNames: string[];
  stageTagNames: string[];
  finalTagName: string | null;
  monthLabel: string;
  personalTagData?: PersonalTagData;
}

export function MonthlyTotalsTable({
  totals,
  responseTagNames,
  stageTagNames,
  finalTagName,
  monthLabel,
  personalTagData,
}: MonthlyTotalsTableProps) {
  const allTags = [
    { label: 'Leads', value: totals.totalLeads },
    { label: 'Responses', value: totals.totalResponses },
    ...responseTagNames.map((name) => ({ label: name, value: totals.responseTagTotals[name] ?? 0 })),
    ...stageTagNames.map((name) => ({ label: name, value: totals.stageTagTotals[name] ?? 0 })),
  ];

  const personalTagTotals = useMemo(() => {
    if (!personalTagData || personalTagData.tagNames.length === 0) return [];
    return personalTagData.tagNames.map((tag) => ({
      label: tag,
      value: personalTagData.monthlyTotals[tag] ?? 0,
    }));
  }, [personalTagData]);

  return (
    <div className="rounded-xl border border-border/50 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-xs" style={{ tableLayout: 'auto' }}>
          <thead>
            <tr>
              <th className="sticky left-0 z-10 bg-accent text-accent-foreground px-2 py-2 text-left font-semibold whitespace-nowrap w-0">Month</th>
              {allTags.map((tag) => (
                <th key={tag.label} className="bg-accent text-accent-foreground px-2 py-2 text-center font-semibold whitespace-nowrap">{tag.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="border-t border-border/30">
              <td className="sticky left-0 z-10 bg-accent text-accent-foreground px-2 py-2 font-medium whitespace-nowrap">{monthLabel}</td>
              {allTags.map((tag) => (
                <td key={tag.label} className={cn('px-2 py-2 text-center', tag.value > 0 ? 'text-foreground font-medium' : 'text-muted-foreground')}>
                  {formatTrackingValue(tag.value)}
                </td>
              ))}
            </tr>
            <PersonalTagExpandableRows
              tagNames={personalTagData?.tagNames ?? []}
              tagTotals={personalTagTotals}
              columnCount={allTags.length}
            />
          </tbody>
        </table>
      </div>
    </div>
  );
}
