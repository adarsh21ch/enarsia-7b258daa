import { useMemo } from 'react';
import { Loader2, Flame, Check, X } from 'lucide-react';
import { CreatorTabLayout, CreatorEmptyState } from '@/components/creator/CreatorTabLayout';
import { useContentPieces } from '@/hooks/useContentPieces';
import { useContentAccounts, type ContentAccount } from '@/hooks/useContentAccounts';
import { CalendarDays } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

function toLocalISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const DAYS = 90;

export default function Activity() {
  const { accounts, isLoading: accountsLoading } = useContentAccounts();
  // Pull ALL pieces for the user (across accounts) for the consistency chart.
  const { pieces, isLoading, savePiece, deletePiece } = useContentPieces();

  const today = useMemo(() => toLocalISO(new Date()), []);

  // Build set of dates with posted pieces.
  const postedDates = useMemo(() => {
    const set = new Set<string>();
    for (const p of pieces) {
      if (p.stage !== 'posted') continue;
      const d = p.posted_date || (p.posted_at ? toLocalISO(new Date(p.posted_at)) : null);
      if (d) set.add(d);
    }
    return set;
  }, [pieces]);

  // Generate last 90 days (oldest first)
  const days = useMemo(() => {
    const arr: { iso: string; date: Date }[] = [];
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    for (let i = DAYS - 1; i >= 0; i--) {
      const d = new Date(start);
      d.setDate(start.getDate() - i);
      arr.push({ iso: toLocalISO(d), date: d });
    }
    return arr;
  }, []);

  // Streaks
  const { current, longest } = useMemo(() => {
    let cur = 0, lng = 0, run = 0;
    // longest scan across the 90-day window
    for (const d of days) {
      if (postedDates.has(d.iso)) { run++; if (run > lng) lng = run; }
      else { run = 0; }
    }
    // current streak: count back from today
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    for (let i = 0; i < DAYS; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() - i);
      if (postedDates.has(toLocalISO(d))) cur++;
      else break;
    }
    return { current: cur, longest: lng };
  }, [days, postedDates]);

  // Per-account: did this account post today? (matches account_id + posted_date=today + stage=posted)
  const postedTodayByAccount = useMemo(() => {
    const map = new Map<string, string>(); // account_id -> piece id
    for (const p of pieces) {
      if (p.stage !== 'posted') continue;
      const d = p.posted_date || (p.posted_at ? toLocalISO(new Date(p.posted_at)) : null);
      if (d === today && p.account_id) map.set(p.account_id, p.id);
    }
    return map;
  }, [pieces, today]);

  const togglePostedToday = async (account: ContentAccount) => {
    const existingId = postedTodayByAccount.get(account.id);
    if (existingId) {
      await deletePiece(existingId);
      toast('Marked as not posted');
    } else {
      await savePiece({
        account_id: account.id,
        title: 'Daily post',
        stage: 'posted',
        posted_date: today,
      });
      toast.success(`Posted today on ${account.name}`);
    }
  };

  const handleDayTap = (iso: string) => {
    const count = pieces.filter((p) => {
      if (p.stage !== 'posted') return false;
      const d = p.posted_date || (p.posted_at ? toLocalISO(new Date(p.posted_at)) : null);
      return d === iso;
    }).length;
    if (count === 0) toast('No posts on this day');
    else toast.success(`${count} post${count === 1 ? '' : 's'} on ${iso}`);
  };

  if (accountsLoading || isLoading) {
    return (
      <CreatorTabLayout title="Activity" subtitle="Stay consistent">
        <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      </CreatorTabLayout>
    );
  }

  if (accounts.length === 0) {
    return (
      <CreatorTabLayout title="Activity" subtitle="Stay consistent">
        <CreatorEmptyState
          icon={CalendarDays}
          headline="Add an account first"
          body="Tap the chip in the header to add your first account, then track your daily posting consistency here."
        />
      </CreatorTabLayout>
    );
  }

  return (
    <CreatorTabLayout title="Activity" subtitle="Stay consistent">
      {/* Streak header */}
      <div className="rounded-2xl border border-border/50 bg-card p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">Consistency</p>
            <p className="text-sm font-semibold mt-0.5">Last 90 days</p>
          </div>
          <div className="flex items-center gap-3 text-right">
            <div>
              <div className="flex items-center gap-1 text-emerald-500"><Flame className="h-3.5 w-3.5" /><span className="text-lg font-bold leading-none">{current}</span></div>
              <p className="text-[10px] text-muted-foreground mt-0.5">Current</p>
            </div>
            <div>
              <p className="text-lg font-bold leading-none">{longest}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Longest</p>
            </div>
          </div>
        </div>

        {/* 90-day grid: 15 cols x 6 rows */}
        <div className="grid grid-cols-[repeat(15,minmax(0,1fr))] gap-1">
          {days.map((d) => {
            const posted = postedDates.has(d.iso);
            const isToday = d.iso === today;
            return (
              <button
                key={d.iso}
                onClick={() => handleDayTap(d.iso)}
                title={d.iso}
                className={cn(
                  'aspect-square rounded-[4px] border transition-transform active:scale-90',
                  posted ? 'bg-emerald-500 border-emerald-600' : 'bg-muted/50 border-border/30',
                  isToday && 'ring-1 ring-primary ring-offset-1 ring-offset-card',
                )}
              />
            );
          })}
        </div>
      </div>

      {/* Daily planner */}
      <div className="rounded-2xl border border-border/50 bg-card p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">Today</p>
            <p className="text-sm font-semibold mt-0.5">Daily planner</p>
          </div>
          <p className="text-[10px] text-muted-foreground">{today}</p>
        </div>

        <div className="space-y-2">
          {accounts.map((a) => {
            const done = postedTodayByAccount.has(a.id);
            return (
              <div key={a.id} className="flex items-center justify-between gap-3 p-3 rounded-xl border border-border/50">
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate">{a.name}</p>
                  <p className="text-[11px] text-muted-foreground capitalize truncate">
                    {a.platform}{a.username ? ` · @${a.username.replace(/^@/, '')}` : ''}
                  </p>
                </div>
                <button
                  onClick={() => togglePostedToday(a)}
                  className={cn(
                    'shrink-0 h-9 w-9 rounded-full flex items-center justify-center border transition-all active:scale-95',
                    done
                      ? 'bg-emerald-500 border-emerald-600 text-white'
                      : 'bg-muted border-border/50 text-muted-foreground hover:text-foreground',
                  )}
                  aria-label={done ? 'Mark as not posted' : 'Mark as posted today'}
                >
                  {done ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </CreatorTabLayout>
  );
}
