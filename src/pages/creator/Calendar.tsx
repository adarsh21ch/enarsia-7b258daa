import { useMemo, useState } from 'react';
import { Loader2, Flame, Check, X, Plus, Trash2, Pencil } from 'lucide-react';
import { CreatorTabLayout, CreatorEmptyState } from '@/components/creator/CreatorTabLayout';
import { useContentPieces } from '@/hooks/useContentPieces';
import { useContentAccounts, type ContentAccount } from '@/hooks/useContentAccounts';
import { usePostingTasks } from '@/hooks/usePostingTasks';
import { CalendarDays } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';

function toLocalISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const DAYS = 90;

export default function Posting() {
  const { accounts, isLoading: accountsLoading } = useContentAccounts();
  const { pieces, isLoading, savePiece, deletePiece } = useContentPieces();
  const today = useMemo(() => toLocalISO(new Date()), []);
  const { tasks, doneMap, loading: tasksLoading, addTask, deleteTask, renameTask, toggle } = usePostingTasks(today);
  const [newTask, setNewTask] = useState('');
  const [manageOpen, setManageOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');

  const postedDates = useMemo(() => {
    const set = new Set<string>();
    for (const p of pieces) {
      if (p.stage !== 'posted') continue;
      const d = p.posted_date || (p.posted_at ? toLocalISO(new Date(p.posted_at)) : null);
      if (d) set.add(d);
    }
    return set;
  }, [pieces]);

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

  const { current, longest } = useMemo(() => {
    let cur = 0, lng = 0, run = 0;
    for (const d of days) {
      if (postedDates.has(d.iso)) { run++; if (run > lng) lng = run; }
      else { run = 0; }
    }
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

  const postedTodayByAccount = useMemo(() => {
    const map = new Map<string, string>();
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

  const submitTask = async () => {
    if (!newTask.trim()) return;
    const v = newTask.trim();
    setNewTask('');
    await addTask(v);
  };

  if (accountsLoading || isLoading) {
    return (
      <CreatorTabLayout title="Posting" subtitle="Stay consistent">
        <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      </CreatorTabLayout>
    );
  }

  if (accounts.length === 0) {
    return (
      <CreatorTabLayout title="Posting" subtitle="Stay consistent">
        <CreatorEmptyState
          icon={CalendarDays}
          headline="Add an account first"
          body="Tap the chip in the header to add your first account, then track your daily posting consistency here."
        />
      </CreatorTabLayout>
    );
  }

  const doneCount = tasks.filter((t) => doneMap.has(t.id)).length;

  return (
    <CreatorTabLayout title="Posting" subtitle="Stay consistent">
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

        <div className="grid w-fit grid-cols-[repeat(15,1rem)] sm:grid-cols-[repeat(18,1rem)] md:grid-cols-[repeat(30,1rem)] gap-1">
          {days.map((d) => {
            const posted = postedDates.has(d.iso);
            const isToday = d.iso === today;
            return (
              <button
                key={d.iso}
                onClick={() => handleDayTap(d.iso)}
                title={d.iso}
                className={cn(
                  'h-4 w-4 rounded-[3px] border transition-transform active:scale-90',
                  posted ? 'bg-emerald-500 border-emerald-600' : 'bg-muted/50 border-border/30',
                  isToday && 'ring-1 ring-primary ring-offset-1 ring-offset-card',
                )}
              />
            );
          })}
        </div>
      </div>

      {/* Daily Output checklist — mirrors NM Daily Tasks (No/Yes toggle + progress) */}
      <div className="rounded-2xl border border-border/50 bg-card p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">Today</p>
            <p className="text-sm font-semibold mt-0.5">My daily output</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <p className="text-[11px] text-muted-foreground tabular-nums">Progress {doneCount}/{tasks.length}</p>
            {tasks.length > 0 && (
              <button
                onClick={() => setManageOpen(true)}
                className="h-7 w-7 rounded-full flex items-center justify-center border border-border/50 text-muted-foreground hover:text-foreground active:scale-95"
                aria-label="Manage daily tasks"
                title="Manage"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden mb-3">
          <div
            className="h-full bg-emerald-500 transition-all"
            style={{ width: tasks.length === 0 ? '0%' : `${Math.round((doneCount / tasks.length) * 100)}%` }}
          />
        </div>

        {tasksLoading ? (
          <div className="flex justify-center py-4"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
        ) : (
          <div className="rounded-xl border border-border/50 overflow-hidden">
            {tasks.map((t, idx) => {
              const done = doneMap.has(t.id);
              return (
                <div
                  key={t.id}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5',
                    idx !== 0 && 'border-t border-border/40',
                    idx % 2 === 1 && 'bg-muted/10',
                  )}
                >
                  <span className={cn(
                    'flex-1 text-sm font-medium truncate',
                    done && 'text-emerald-700 dark:text-emerald-400',
                  )}>{t.label}</span>
                  <div className="flex items-center bg-muted/60 rounded-full p-0.5 h-7 shrink-0">
                    <button
                      onClick={() => { if (done) toggle(t.id); }}
                      className={cn(
                        'px-2.5 py-1 rounded-full text-xs font-medium transition-all',
                        !done ? 'bg-red-500 text-white' : 'text-muted-foreground hover:text-red-500',
                      )}
                      aria-label="Mark not done"
                    >
                      No
                    </button>
                    <button
                      onClick={() => { if (!done) toggle(t.id); }}
                      className={cn(
                        'px-2.5 py-1 rounded-full text-xs font-medium transition-all',
                        done ? 'bg-emerald-500 text-white' : 'text-muted-foreground hover:text-emerald-500',
                      )}
                      aria-label="Mark done"
                    >
                      Yes
                    </button>
                  </div>
                </div>
              );
            })}

            {tasks.length === 0 && (
              <p className="text-[12px] text-muted-foreground px-3 py-4 text-center">
                Define your daily outputs once. e.g. "1 Reel", "1 Story", "1 Post".
              </p>
            )}
          </div>
        )}

        {/* Composer */}
        <div className="flex items-center gap-2 pt-3">
          <Input
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); submitTask(); } }}
            placeholder="Add recurring daily task…"
            className="h-9 rounded-full bg-card text-sm"
            maxLength={60}
          />
          <button
            onClick={submitTask}
            disabled={!newTask.trim() || tasks.length >= 10}
            className="h-9 w-9 shrink-0 rounded-full flex items-center justify-center bg-primary text-primary-foreground disabled:opacity-50 active:scale-95"
            aria-label="Add task"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
        {tasks.length >= 10 && (
          <p className="text-[10px] text-muted-foreground pt-1.5 text-center">Max 10 daily tasks.</p>
        )}
      </div>

      {/* Manage tasks sheet */}
      <Sheet open={manageOpen} onOpenChange={(o) => { setManageOpen(o); if (!o) { setEditingId(null); setEditLabel(''); } }}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[70vh]">
          <SheetHeader><SheetTitle>Manage daily output</SheetTitle></SheetHeader>
          <div className="mt-3 space-y-1.5">
            {tasks.map((t) => {
              const isEditing = editingId === t.id;
              return (
                <div key={t.id} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border/50 bg-card">
                  {isEditing ? (
                    <Input
                      autoFocus
                      value={editLabel}
                      onChange={(e) => setEditLabel(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          if (editLabel.trim()) renameTask(t.id, editLabel.trim());
                          setEditingId(null);
                        } else if (e.key === 'Escape') { setEditingId(null); }
                      }}
                      onBlur={() => {
                        if (editLabel.trim() && editLabel.trim() !== t.label) renameTask(t.id, editLabel.trim());
                        setEditingId(null);
                      }}
                      className="h-8 text-sm"
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => { setEditingId(t.id); setEditLabel(t.label); }}
                      className="flex-1 text-sm font-medium truncate text-left"
                    >
                      {t.label}
                    </button>
                  )}
                  {!isEditing && (
                    <>
                      <button
                        onClick={() => { setEditingId(t.id); setEditLabel(t.label); }}
                        className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted"
                        aria-label="Rename"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => deleteTask(t.id)}
                        className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        aria-label="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </>
                  )}
                </div>
              );
            })}
            {tasks.length === 0 && (
              <p className="text-xs text-muted-foreground py-4 text-center">No tasks yet.</p>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Per-account posted today (kept) */}
      <div className="rounded-2xl border border-border/50 bg-card p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">Accounts</p>
            <p className="text-sm font-semibold mt-0.5">Posted today</p>
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
