/**
 * Member-side: view + tick today's compulsory checklist (from your leader).
 * Wraps the existing useDailyTasks hook — direct upsert under RLS, no edge fn.
 */
import { Check, X, ListChecks, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useDailyTasks } from '@/hooks/useDailyTasks';

interface Props {
  date: string;
}

export function CompulsoryActionsMemberTab({ date }: Props) {
  const { tasks, templateName, loading, hasLeader, markTask } = useDailyTasks(date);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
      </div>
    );
  }

  if (!hasLeader) {
    return (
      <div className="rounded-md border border-dashed border-border/60 p-4 text-center text-xs text-muted-foreground">
        You aren't connected to a leader yet. Connect via your upline's email or Leader ID to receive a checklist.
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-border/60 p-4 text-center text-xs text-muted-foreground">
        Your leader hasn't set any compulsory actions for {date} yet.
      </div>
    );
  }

  const done = tasks.filter(t => t.status === 'yes').length;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <ListChecks className="h-3.5 w-3.5 text-primary" />
          <span className="font-medium">{templateName || 'Compulsory Actions'}</span>
        </div>
        <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
          {done}/{tasks.length} done
        </span>
      </div>

      <ul className="divide-y divide-border/40 rounded-md border border-border/40">
        {tasks.map((t) => (
          <li key={t.id} className="flex items-center gap-2 px-2.5 py-2 text-xs">
            <span className="flex-1 truncate">{t.item_title}</span>
            <div className="flex gap-1">
              <Button
                size="icon"
                variant={t.status === 'yes' ? 'default' : 'outline'}
                className={cn(
                  'h-7 w-7',
                  t.status === 'yes' && 'bg-emerald-500 hover:bg-emerald-600 text-white',
                )}
                onClick={() => markTask(t.id, t.status === 'yes' ? null : 'yes')}
              >
                <Check className="h-3.5 w-3.5" />
              </Button>
              <Button
                size="icon"
                variant={t.status === 'no' ? 'default' : 'outline'}
                className={cn(
                  'h-7 w-7',
                  t.status === 'no' && 'bg-rose-500 hover:bg-rose-600 text-white',
                )}
                onClick={() => markTask(t.id, t.status === 'no' ? null : 'no')}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
