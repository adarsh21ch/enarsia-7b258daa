// Daily Tasks View - Shows leader-assigned tasks + user's recurring daily tasks
import { useState } from 'react';
import { useDailyTasks } from '@/hooks/useDailyTasks';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Loader2, ClipboardList, Trash2, ListTodo } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TriStateToggle } from './TriStateToggle';

interface UserDailyTaskWithStatus {
  id: string;
  title: string;
  is_active: boolean;
  sort_order: number;
  status: 'yes' | 'no' | null;
}

interface DailyTasksViewProps {
  selectedDate: Date;
  selectedDateString: string;
  userTasks: UserDailyTaskWithStatus[];
  userTasksLoading: boolean;
  markUserTask: (taskId: string, status: 'yes' | 'no' | null) => Promise<void>;
  deleteUserTask: (taskId: string) => Promise<void>;
  renameUserTask?: (taskId: string, title: string) => Promise<void>;
}

export function DailyTasksView({
  selectedDate,
  selectedDateString,
  userTasks,
  userTasksLoading,
  markUserTask,
  deleteUserTask,
  renameUserTask,
}: DailyTasksViewProps) {
  const { tasks: leaderTasks, templateName, loading: leaderLoading, hasLeader, markTask: markLeaderTask } = useDailyTasks(selectedDateString);

  const [editingTask, setEditingTask] = useState<UserDailyTaskWithStatus | null>(null);
  const [editTitle, setEditTitle] = useState('');

  const openEdit = (task: UserDailyTaskWithStatus) => {
    setEditingTask(task);
    setEditTitle(task.title);
  };

  const closeEdit = () => {
    setEditingTask(null);
    setEditTitle('');
  };

  const handleSave = async () => {
    if (!editingTask || !renameUserTask) return closeEdit();
    const trimmed = editTitle.trim();
    if (trimmed && trimmed !== editingTask.title) {
      await renameUserTask(editingTask.id, trimmed);
    }
    closeEdit();
  };

  const handleDelete = async () => {
    if (!editingTask) return;
    await deleteUserTask(editingTask.id);
    closeEdit();
  };

  const leaderCompletedCount = leaderTasks.filter(t => t.status === 'yes').length;
  const leaderTotalCount = leaderTasks.length;
  const userCompletedCount = userTasks.filter(t => t.status === 'yes').length;
  const userTotalCount = userTasks.length;

  if (leaderLoading || userTasksLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const hasLeaderTasks = hasLeader && leaderTasks.length > 0;
  const hasUserTasks = userTasks.length > 0;
  const showEmptyState = !hasLeaderTasks && !hasUserTasks;

  if (showEmptyState) {
    return (
      <div className="py-12 px-4 text-center">
        <ClipboardList className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
        <p className="text-sm font-medium text-muted-foreground mb-1">No Daily Tasks</p>
        <p className="text-xs text-muted-foreground/70">Add a recurring daily task using the input below</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 pt-[5px]">
      {/* Leader Tasks Section */}
      {hasLeaderTasks && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">From Leader: Compulsory Actions</p>
              <p className="text-sm font-semibold text-primary">{templateName}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Progress</p>
              <p className="text-sm font-semibold">
                <span className="text-green-600">{leaderCompletedCount}</span>
                <span className="text-muted-foreground">/{leaderTotalCount}</span>
              </p>
            </div>
          </div>

          <div className="bg-white dark:bg-card rounded-xl border border-border/40 shadow-sm overflow-hidden">
            <div className="divide-y divide-border/20">
              {leaderTasks.map((task, index) => (
                <div
                  key={task.id}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3 transition-all',
                    index % 2 === 0 ? 'bg-white dark:bg-card' : 'bg-gray-50/50 dark:bg-muted/10'
                  )}
                >
                  <span className="text-xs font-semibold text-muted-foreground w-5 shrink-0 tabular-nums">
                    {index + 1}.
                  </span>
                  <div className="flex-1 min-w-0">
                    <p
                      className={cn(
                        'text-sm font-medium',
                        task.status === 'yes' && 'text-green-700 dark:text-green-400',
                        task.status === 'no' && 'text-red-600 dark:text-red-400 line-through opacity-70'
                      )}
                    >
                      {task.item_title}
                    </p>
                  </div>
                  <TriStateToggle value={task.status} onChange={(s) => markLeaderTask(task.id, s)} />
                </div>
              ))}
            </div>

            <div className="px-4 py-3 bg-muted/30 border-t border-border/30">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{leaderTasks.filter(t => t.status === null).length} not marked</span>
                <span className="font-medium">{Math.round((leaderCompletedCount / leaderTotalCount) * 100)}% complete</span>
              </div>
              <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-green-500 transition-all duration-300" style={{ width: `${(leaderCompletedCount / leaderTotalCount) * 100}%` }} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* User's Personal Daily Tasks Section */}
      {hasUserTasks && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ListTodo className="h-4 w-4 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">My Daily Tasks</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Progress</p>
              <p className="text-sm font-semibold">
                <span className="text-green-600">{userCompletedCount}</span>
                <span className="text-muted-foreground">/{userTotalCount}</span>
              </p>
            </div>
          </div>

          <div className="bg-white dark:bg-card rounded-xl border border-border/40 shadow-sm overflow-hidden">
            <div className="divide-y divide-border/20">
              {userTasks.map((task, index) => (
                <div
                  key={task.id}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3 transition-all',
                    index % 2 === 0 ? 'bg-white dark:bg-card' : 'bg-gray-50/50 dark:bg-muted/10'
                  )}
                >
                  <span className="text-xs font-semibold text-muted-foreground w-5 shrink-0 tabular-nums">
                    {index + 1}.
                  </span>
                  <button
                    type="button"
                    onClick={() => openEdit(task)}
                    className="flex-1 min-w-0 text-left active:opacity-70 transition-opacity"
                  >
                    <p
                      className={cn(
                        'text-sm font-medium truncate',
                        task.status === 'yes' && 'text-green-700 dark:text-green-400',
                        task.status === 'no' && 'text-red-600 dark:text-red-400 line-through opacity-70'
                      )}
                    >
                      {task.title}
                    </p>
                  </button>
                  <TriStateToggle value={task.status} onChange={(s) => markUserTask(task.id, s)} />
                </div>
              ))}
            </div>

            <div className="px-4 py-3 bg-muted/30 border-t border-border/30">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{userTasks.filter(t => t.status === null).length} not marked</span>
                <span className="font-medium">{Math.round((userCompletedCount / userTotalCount) * 100)}% complete</span>
              </div>
              <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-green-500 transition-all duration-300" style={{ width: `${(userCompletedCount / userTotalCount) * 100}%` }} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit / Delete dialog for user tasks */}
      <Dialog open={!!editingTask} onOpenChange={(open) => !open && closeEdit()}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit Daily Task</DialogTitle>
          </DialogHeader>
          <Input
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            placeholder="Task name"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSave();
            }}
          />
          <DialogFooter className="flex-row justify-between gap-2 sm:justify-between">
            <Button
              variant="ghost"
              onClick={handleDelete}
              className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
            >
              <Trash2 className="h-4 w-4 mr-1.5" />
              Delete
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={closeEdit}>Cancel</Button>
              <Button onClick={handleSave}>Save</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
