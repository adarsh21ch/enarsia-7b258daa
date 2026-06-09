import { useMemo, useState } from 'react';
import { Columns3, X, Check } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useMemberAggregates } from '@/hooks/useMemberAggregates';
import type { TeamMemberProfile } from '@/hooks/useLeaderTeamMembers';

interface CompareColumnsSheetProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  members: TeamMemberProfile[];
  monthStart: string;
  monthEnd: string;
  monthLabel: string;
  responseTagNames: string[];
  stageTagNames: string[];
  finalTagName: string | null;
}

const MAX_COMPARE = 6;

/**
 * Side-by-side comparison of multiple downline members for the active month.
 * Read-only. Pulls per-member totals via useMemberAggregates (direct downline
 * snapshots under existing RLS — does NOT touch grand-downline).
 */
export function CompareColumnsSheet({
  open, onOpenChange, members, monthStart, monthEnd, monthLabel,
  responseTagNames, stageTagNames, finalTagName,
}: CompareColumnsSheetProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [source, setSource] = useState<'personal' | 'total'>('total');

  const selectedMembers = useMemo(
    () => members.filter(m => selected.has(m.user_id)),
    [members, selected],
  );

  const { data: aggregates, loading } = useMemberAggregates({
    memberIds: selectedMembers.map(m => m.user_id),
    monthStart, monthEnd, responseTagNames, stageTagNames, source,
  });

  const toggle = (id: string) => {
    setSelected(s => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else if (next.size < MAX_COMPARE) next.add(id);
      return next;
    });
  };

  const handleOpenChange = (v: boolean) => {
    if (!v) setSelected(new Set());
    onOpenChange(v);
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-3xl p-0 flex flex-col">
        <SheetHeader className="px-4 py-3 border-b border-border/40">
          <div className="flex items-center gap-2">
            <Columns3 className="h-4 w-4 text-primary" />
            <SheetTitle className="text-base">Compare Members</SheetTitle>
          </div>
          <SheetDescription className="text-xs text-left">
            {monthLabel} · pick up to {MAX_COMPARE} members to compare side-by-side
          </SheetDescription>

          <div className="mt-2 flex gap-1 rounded-lg bg-muted p-0.5 w-fit">
            {(['total', 'personal'] as const).map(s => (
              <button
                key={s}
                onClick={() => setSource(s)}
                className={cn(
                  'rounded-md px-3 py-1 text-[11px] font-medium transition-colors',
                  source === s ? 'bg-background shadow-sm' : 'text-muted-foreground',
                )}
              >
                {s === 'total' ? 'Team Total' : 'Personal'}
              </button>
            ))}
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto">
          {/* Picker */}
          <div className="px-3 py-2 border-b border-border/40">
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Select members ({selected.size}/{MAX_COMPARE})
            </p>
            <div className="flex flex-wrap gap-1">
              {members.map(m => {
                const isSel = selected.has(m.user_id);
                const name = m.display_name || m.email || 'Unnamed';
                return (
                  <button
                    key={m.user_id}
                    onClick={() => toggle(m.user_id)}
                    disabled={!isSel && selected.size >= MAX_COMPARE}
                    className={cn(
                      'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] transition-colors',
                      isSel
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border/40 hover:bg-muted/60 disabled:opacity-40',
                    )}
                  >
                    {isSel && <Check className="h-2.5 w-2.5" />}
                    <span className="max-w-[120px] truncate">{name}</span>
                  </button>
                );
              })}
              {members.length === 0 && (
                <span className="text-[11px] text-muted-foreground">No members in your team yet.</span>
              )}
            </div>
          </div>

          {/* Comparison table */}
          {selectedMembers.length === 0 ? (
            <div className="px-3 py-12 text-center text-xs text-muted-foreground">
              Pick at least one member to see the comparison.
            </div>
          ) : (
            <div className="overflow-x-auto p-3">
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr className="border-b border-border/40">
                    <th className="sticky left-0 z-10 bg-background px-2 py-1.5 text-left font-semibold">Metric</th>
                    {selectedMembers.map(m => (
                      <th key={m.user_id} className="min-w-[110px] px-2 py-1.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <span className="max-w-[100px] truncate text-[11px] font-semibold">
                            {m.display_name || m.email || 'Unnamed'}
                          </span>
                          <button
                            onClick={() => toggle(m.user_id)}
                            className="opacity-50 hover:opacity-100"
                            aria-label="Remove"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <CompareRow
                    label="Total Leads"
                    values={selectedMembers.map(m => aggregates.get(m.user_id)?.totalLeads ?? 0)}
                    bold
                  />
                  <CompareRow
                    label="Total Responses"
                    values={selectedMembers.map(m => aggregates.get(m.user_id)?.totalResponses ?? 0)}
                  />
                  <CompareRow
                    label="Days w/ data"
                    values={selectedMembers.map(m => aggregates.get(m.user_id)?.daysWithData ?? 0)}
                    muted
                  />

                  {responseTagNames.length > 0 && (
                    <tr><td colSpan={selectedMembers.length + 1} className="pt-3 pb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Responses</td></tr>
                  )}
                  {responseTagNames.map(name => (
                    <CompareRow
                      key={`r-${name}`}
                      label={name}
                      values={selectedMembers.map(m => aggregates.get(m.user_id)?.responseTags[name] ?? 0)}
                    />
                  ))}

                  {stageTagNames.length > 0 && (
                    <tr><td colSpan={selectedMembers.length + 1} className="pt-3 pb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Stages</td></tr>
                  )}
                  {stageTagNames.map(name => (
                    <CompareRow
                      key={`s-${name}`}
                      label={name}
                      values={selectedMembers.map(m => aggregates.get(m.user_id)?.stageTags[name] ?? 0)}
                    />
                  ))}

                  {finalTagName && (
                    <CompareRow
                      label={`${finalTagName} (final)`}
                      values={selectedMembers.map(m => aggregates.get(m.user_id)?.finalTagCount ?? 0)}
                      bold
                      highlight
                    />
                  )}
                </tbody>
              </table>

              {loading && (
                <p className="mt-2 text-center text-[10px] text-muted-foreground">Loading…</p>
              )}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function CompareRow({
  label, values, bold, muted, highlight,
}: { label: string; values: number[]; bold?: boolean; muted?: boolean; highlight?: boolean }) {
  const max = Math.max(...values);
  return (
    <tr className="border-b border-border/20">
      <td className={cn(
        'sticky left-0 z-10 bg-background px-2 py-1 text-left',
        bold && 'font-semibold',
        muted && 'text-muted-foreground',
      )}>
        {label}
      </td>
      {values.map((v, i) => (
        <td
          key={i}
          className={cn(
            'px-2 py-1 text-right tabular-nums',
            bold && 'font-bold',
            muted && 'text-muted-foreground',
            highlight && v === max && v > 0 && 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
            !highlight && v === max && v > 0 && values.length > 1 && 'text-primary',
          )}
        >
          {v}
        </td>
      ))}
    </tr>
  );
}
