/**
 * Compulsory Actions sheet — three tabs:
 *   • Team grid: leader sees a yes/no/blank matrix of direct downline × items for a chosen level/date.
 *   • Manage: leader edits the template items for the chosen level.
 *   • My checklist: current user ticks their own daily compulsory items (works for everyone).
 *
 * Direct downline is discovered upstream by useLeaderTeamMembers (dual-key rule),
 * so legacy-connected members appear here too. Read-only matrix; member writes go
 * through useDailyTasks (direct upsert under RLS). No snapshot writes happen here,
 * so the rollup invariant is unaffected.
 */
import { useEffect, useMemo, useState } from 'react';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Check, X, Minus, ChevronLeft, ChevronRight, RefreshCw, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTeamCompulsoryGrid, type CompulsoryStatus } from '@/hooks/useTeamCompulsoryGrid';
import { CompulsoryActionsLeaderTab } from './CompulsoryActionsLeaderTab';
import { CompulsoryActionsMemberTab } from './CompulsoryActionsMemberTab';
import { todayIST } from '@/hooks/useTeamActivityStatus';
import type { TeamMemberProfile } from '@/hooks/useLeaderTeamMembers';

interface LevelOpt {
  id: string;
  label: string;
  position: number;
  count: number;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  leaderUserId: string;
  members: TeamMemberProfile[];
  levels: { id: string; label: string; position: number }[];
}

function addDays(date: string, delta: number) {
  const d = new Date(date + 'T00:00:00');
  d.setDate(d.getDate() + delta);
  return d.toISOString().slice(0, 10);
}

export function CompulsoryActionsSheet({
  open, onOpenChange, leaderUserId, members, levels,
}: Props) {
  const [tab, setTab] = useState<'grid' | 'manage' | 'mine'>('grid');
  const [date, setDate] = useState<string>(todayIST());

  // Level options (only levels that have at least one member shown first)
  const levelOpts = useMemo<LevelOpt[]>(() => {
    return levels.map(l => ({
      id: l.id,
      label: l.label,
      position: l.position,
      count: members.filter(m => m.level_id === l.id).length,
    }));
  }, [levels, members]);

  const [activeLevelId, setActiveLevelId] = useState<string | null>(null);
  useEffect(() => {
    if (!activeLevelId && levelOpts.length > 0) {
      setActiveLevelId(levelOpts[0].id);
    }
  }, [levelOpts, activeLevelId]);

  const activeLevel = useMemo(
    () => levelOpts.find(l => l.id === activeLevelId) || null,
    [levelOpts, activeLevelId],
  );

  const membersInLevel = useMemo(
    () => activeLevelId ? members.filter(m => m.level_id === activeLevelId) : [],
    [members, activeLevelId],
  );

  const { items, statusByMember, loading, error, refresh } = useTeamCompulsoryGrid(
    open && tab === 'grid' ? leaderUserId : null,
    activeLevel?.position ?? null,
    membersInLevel.map(m => m.user_id),
    date,
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full max-w-2xl overflow-y-auto p-0">
        <SheetHeader className="border-b border-border/40 px-4 py-3">
          <SheetTitle className="text-base">Compulsory Actions</SheetTitle>
          <SheetDescription className="text-xs">
            Daily checklist for your team. Members tick their items; you see who completed what.
          </SheetDescription>
        </SheetHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="flex flex-col">
          <div className="border-b border-border/40 px-3 py-2">
            <TabsList className="grid w-full grid-cols-3 h-8">
              <TabsTrigger value="grid" className="text-xs">Team Grid</TabsTrigger>
              <TabsTrigger value="manage" className="text-xs">Manage</TabsTrigger>
              <TabsTrigger value="mine" className="text-xs">My Checklist</TabsTrigger>
            </TabsList>
          </div>

          {/* Shared level + date controls (grid + manage) */}
          {(tab === 'grid' || tab === 'manage') && (
            <div className="flex flex-col gap-2 border-b border-border/40 px-3 py-2">
              <div className="flex flex-wrap gap-1.5">
                {levelOpts.length === 0 && (
                  <p className="text-[11px] text-muted-foreground">
                    No levels defined yet. Create levels in your profile to assign compulsory actions per tier.
                  </p>
                )}
                {levelOpts.map(l => (
                  <button
                    key={l.id}
                    onClick={() => setActiveLevelId(l.id)}
                    className={cn(
                      'rounded-md border px-2 py-1 text-[11px] transition-colors',
                      activeLevelId === l.id
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border/60 text-muted-foreground hover:bg-muted/50',
                    )}
                  >
                    {l.label}
                    <span className="ml-1 opacity-60">· {l.count}</span>
                  </button>
                ))}
              </div>

              {tab === 'grid' && (
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDate(d => addDays(d, -1))}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-xs font-semibold">{date}</span>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDate(d => addDays(d, 1))}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                    {date !== todayIST() && (
                      <Button variant="ghost" size="sm" className="h-7 px-2 text-[11px]" onClick={() => setDate(todayIST())}>
                        Today
                      </Button>
                    )}
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={refresh}>
                    <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
                  </Button>
                </div>
              )}
            </div>
          )}

          <TabsContent value="grid" className="m-0 p-3">
            {!activeLevel ? (
              <p className="text-center text-xs text-muted-foreground">Pick a level above.</p>
            ) : items.length === 0 ? (
              <div className="rounded-md border border-dashed border-border/60 p-4 text-center text-xs text-muted-foreground">
                No active compulsory actions defined for <b>{activeLevel.label}</b> on {date}.
                Switch to <b>Manage</b> to add some.
              </div>
            ) : membersInLevel.length === 0 ? (
              <div className="rounded-md border border-dashed border-border/60 p-4 text-center text-xs text-muted-foreground">
                No members assigned to <b>{activeLevel.label}</b>.
              </div>
            ) : error ? (
              <p className="text-center text-xs text-destructive">{error}</p>
            ) : (
              <div className="overflow-x-auto rounded-md border border-border/40">
                <table className="min-w-full text-xs">
                  <thead className="bg-muted/40">
                    <tr>
                      <th className="sticky left-0 z-10 bg-muted/40 px-2 py-1.5 text-left font-semibold">
                        <div className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          Member
                        </div>
                      </th>
                      {items.map(it => (
                        <th key={it.id} className="px-2 py-1.5 text-center font-medium" title={it.item_title}>
                          <span className="line-clamp-2 max-w-[120px] inline-block">{it.item_title}</span>
                        </th>
                      ))}
                      <th className="px-2 py-1.5 text-center font-semibold">Done</th>
                    </tr>
                  </thead>
                  <tbody>
                    {membersInLevel.map(m => {
                      const row = statusByMember.get(m.user_id);
                      const yes = row?.yesCount ?? 0;
                      const total = items.length;
                      return (
                        <tr key={m.user_id} className="border-t border-border/40">
                          <td className="sticky left-0 z-10 bg-background px-2 py-1.5">
                            <div className="truncate font-medium">{m.display_name || m.email || 'Member'}</div>
                            {m.email && <div className="truncate text-[10px] text-muted-foreground">{m.email}</div>}
                          </td>
                          {items.map(it => {
                            const s: CompulsoryStatus = row?.statuses[it.id] ?? null;
                            return (
                              <td key={it.id} className="px-2 py-1.5 text-center">
                                <StatusPill status={s} />
                              </td>
                            );
                          })}
                          <td className="px-2 py-1.5 text-center">
                            <Badge variant="secondary" className={cn(
                              'h-5 px-1.5 text-[10px]',
                              yes === total && total > 0 && 'bg-emerald-500/15 text-emerald-600',
                              yes === 0 && 'bg-muted text-muted-foreground',
                            )}>
                              {yes}/{total}
                            </Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>

          <TabsContent value="manage" className="m-0 p-3">
            {activeLevel ? (
              <CompulsoryActionsLeaderTab
                levelPosition={activeLevel.position}
                levelLabel={activeLevel.label}
              />
            ) : (
              <p className="text-center text-xs text-muted-foreground">Pick a level above.</p>
            )}
          </TabsContent>

          <TabsContent value="mine" className="m-0 p-3">
            <CompulsoryActionsMemberTab date={date} />
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}

function StatusPill({ status }: { status: CompulsoryStatus }) {
  if (status === 'yes') {
    return (
      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600">
        <Check className="h-3.5 w-3.5" />
      </span>
    );
  }
  if (status === 'no') {
    return (
      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-rose-500/15 text-rose-600">
        <X className="h-3.5 w-3.5" />
      </span>
    );
  }
  return (
    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-muted text-muted-foreground/60">
      <Minus className="h-3 w-3" />
    </span>
  );
}
