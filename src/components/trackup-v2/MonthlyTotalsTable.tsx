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
        <table className="text-xs" style={{ tableLayout: 'fixed', width: `${allTags.length * 70 + 90}px` }}>
          <colgroup>
            <col style={{ width: '90px' }} />
            {allTags.map((tag) => (
              <col key={tag.label} style={{ width: '70px' }} />
            ))}
          </colgroup>
          <thead>
            <tr className="bg-muted/60 border-b border-border">
              <th className="sticky left-0 z-10 bg-muted/60 text-muted-foreground px-2 py-2 text-left font-semibold whitespace-nowrap uppercase tracking-wider text-[10px]">Month</th>
              {allTags.map((tag) => (
                <th key={tag.label} className="bg-muted/60 text-muted-foreground px-2 py-2 text-center font-semibold whitespace-nowrap uppercase tracking-wider text-[10px]">{tag.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="border-t border-border/40">
              <td className="sticky left-0 z-10 bg-card text-foreground px-2 py-2 font-medium whitespace-nowrap overflow-hidden text-ellipsis">{monthLabel}</td>
              {allTags.map((tag) => (
                <td key={tag.label} className={cn('px-2 py-2 text-center', tag.value > 0 ? 'text-primary font-semibold' : 'text-muted-foreground/60')}>
                  {tag.value > 0 ? formatTrackingValue(tag.value) : '–'}
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
