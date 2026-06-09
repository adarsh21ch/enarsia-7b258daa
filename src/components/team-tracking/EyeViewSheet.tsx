import { useState, useMemo } from 'react';
import { ChevronRight, ChevronLeft, Activity, CheckCircle2, XCircle, Zap, RefreshCw } from 'lucide-react';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useTeamActivityStatus, todayIST, type TeamActivityRow } from '@/hooks/useTeamActivityStatus';

interface EyeViewSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The root leader the sheet starts at (typically auth user id). */
  rootLeaderUserId: string;
  rootLeaderName?: string;
}

interface StackFrame {
  userId: string;
  name: string;
}

/**
 * "Activity Status" / Eye View — read-only sheet showing which downline members
 * updated their tracking today (IST). Supports drill-down into a member's own
 * sub-team using the same dual-key BFS via the RPC.
 */
export function EyeViewSheet({ open, onOpenChange, rootLeaderUserId, rootLeaderName }: EyeViewSheetProps) {
  const [stack, setStack] = useState<StackFrame[]>([
    { userId: rootLeaderUserId, name: rootLeaderName || 'You' },
  ]);
  const current = stack[stack.length - 1];
  const date = todayIST();

  const { rows, updatedCount, totalCount, loading, error, refresh } =
    useTeamActivityStatus(open ? current.userId : null, date);

  // Reset stack when sheet closes
  const handleOpenChange = (v: boolean) => {
    if (!v) setStack([{ userId: rootLeaderUserId, name: rootLeaderName || 'You' }]);
    onOpenChange(v);
  };

  const drillInto = (row: TeamActivityRow) => {
    setStack(s => [...s, { userId: row.user_id, name: row.display_name || row.email || 'Member' }]);
  };
  const goBack = () => setStack(s => (s.length > 1 ? s.slice(0, -1) : s));

  const { updated, notUpdated } = useMemo(() => ({
    updated: rows.filter(r => r.updated),
    notUpdated: rows.filter(r => !r.updated),
  }), [rows]);

  const pct = totalCount ? Math.round((updatedCount / totalCount) * 100) : 0;

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col">
        <SheetHeader className="px-4 py-3 border-b border-border/40">
          <div className="flex items-center gap-2">
            {stack.length > 1 && (
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={goBack}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
            )}
            <Activity className="h-4 w-4 text-primary" />
            <SheetTitle className="text-base">Activity Status</SheetTitle>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 ml-auto"
              onClick={refresh}
              disabled={loading}
              aria-label="Refresh"
            >
              <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
            </Button>
          </div>
          <SheetDescription className="text-xs text-left">
            <span className="font-medium text-foreground">{current.name}</span>
            <span className="opacity-60"> · {date} (IST)</span>
          </SheetDescription>

          {/* Breadcrumb */}
          {stack.length > 1 && (
            <div className="text-[11px] text-muted-foreground flex items-center gap-1 flex-wrap pt-1">
              {stack.map((f, i) => (
                <span key={i} className="flex items-center gap-1">
                  {i > 0 && <ChevronRight className="h-3 w-3 opacity-50" />}
                  <span className={cn(i === stack.length - 1 && 'text-foreground font-medium')}>{f.name}</span>
                </span>
              ))}
            </div>
          )}

          {/* Summary bar */}
          {!loading && totalCount > 0 && (
            <div className="pt-2">
              <div className="flex items-center justify-between text-[11px] mb-1">
                <span className="font-medium">{updatedCount} of {totalCount} updated today</span>
                <span className="text-muted-foreground">{pct}%</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-emerald-500 transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          )}
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-3 py-2 text-sm">
          {loading && (
            <p className="px-2 py-6 text-center text-xs text-muted-foreground">Loading activity…</p>
          )}
          {error && !loading && (
            <p className="px-2 py-6 text-center text-xs text-destructive">{error}</p>
          )}
          {!loading && !error && totalCount === 0 && (
            <p className="px-2 py-6 text-center text-xs text-muted-foreground">
              No team members under {current.name}.
            </p>
          )}

          {!loading && !error && notUpdated.length > 0 && (
            <Section
              title="Not updated"
              count={notUpdated.length}
              tone="warn"
              rows={notUpdated}
              onDrill={drillInto}
            />
          )}
          {!loading && !error && updated.length > 0 && (
            <Section
              title="Updated"
              count={updated.length}
              tone="ok"
              rows={updated}
              onDrill={drillInto}
            />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Section({
  title, count, tone, rows, onDrill,
}: {
  title: string; count: number; tone: 'ok' | 'warn';
  rows: TeamActivityRow[]; onDrill: (r: TeamActivityRow) => void;
}) {
  return (
    <div className="mb-4">
      <div className="px-1 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
        <span className={cn(
          'h-1.5 w-1.5 rounded-full',
          tone === 'ok' ? 'bg-emerald-500' : 'bg-amber-500',
        )} />
        {title}
        <span className="opacity-50">· {count}</span>
      </div>
      <div className="space-y-1">
        {rows.map(r => <MemberRow key={r.user_id} row={r} onDrill={onDrill} />)}
      </div>
    </div>
  );
}

function MemberRow({ row, onDrill }: { row: TeamActivityRow; onDrill: (r: TeamActivityRow) => void }) {
  const name = row.display_name || row.email || 'Unnamed';
  const initials = name.slice(0, 2).toUpperCase();
  return (
    <button
      onClick={() => onDrill(row)}
      className="w-full flex items-center gap-2 rounded-md border border-border/40 bg-card/50 px-2 py-1.5 text-left transition-colors hover:bg-muted/60 active:scale-[0.99]"
    >
      <div className={cn(
        'flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-bold',
        row.updated ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' : 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
      )}>
        {initials}
      </div>
      <div className="flex-1 min-w-0">
        <div className="truncate text-xs font-medium">{name}</div>
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          {row.updated ? (
            <>
              {row.reason === 'snapshot' ? (
                <><CheckCircle2 className="h-2.5 w-2.5 text-emerald-500" /> Snapshot saved</>
              ) : (
                <><Zap className="h-2.5 w-2.5 text-emerald-500" /> Auto ({row.personal_source})</>
              )}
            </>
          ) : (
            <>
              <XCircle className="h-2.5 w-2.5 text-amber-500" />
              {row.personal_source === 'MANUAL' ? 'No update today (Manual)' : 'No update today'}
            </>
          )}
        </div>
      </div>
      <Badge variant="outline" className="h-5 px-1.5 text-[9px] gap-0.5">
        Drill
        <ChevronRight className="h-2.5 w-2.5" />
      </Badge>
    </button>
  );
}
