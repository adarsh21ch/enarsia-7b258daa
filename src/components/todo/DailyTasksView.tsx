// Daily Tasks View - Shows leader-assigned tasks + user's recurring daily tasks
import { useDailyTasks } from '@/hooks/useDailyTasks';
import { Button } from '@/components/ui/button';
import { Loader2, ClipboardList, Trash2, ListTodo } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

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
}

export function DailyTasksView({ 
  selectedDate, 
  selectedDateString,
  userTasks,
  userTasksLoading,
  markUserTask,
  deleteUserTask
}: DailyTasksViewProps) {
  const { tasks: leaderTasks, templateName, loading: leaderLoading, hasLeader, markTask: markLeaderTask } = useDailyTasks(selectedDateString);

  const leaderCompletedCount = leaderTasks.filter(t => t.status === 'yes').length;
  const leaderTotalCount = leaderTasks.length;

  const userCompletedCount = userTasks.filter(t => t.status === 'yes').length;
  const userTotalCount = userTasks.length;

  const handleLeaderStatusChange = async (taskId: string, newStatus: 'yes' | 'no' | null) => {
    await markLeaderTask(taskId, newStatus);
  };

  const handleUserStatusChange = async (taskId: string, newStatus: 'yes' | 'no' | null) => {
    await markUserTask(taskId, newStatus);
  };

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
        <p className="text-sm font-medium text-muted-foreground mb-1">
          No Daily Tasks
        </p>
        <p className="text-xs text-muted-foreground/70">
          Add a recurring daily task using the input below
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 pt-[5px]">

      {/* Leader Tasks Section */}
      {hasLeaderTasks && (
        <div className="space-y-2">
          {/* Header with template name and progress */}
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

          {/* Leader Tasks list */}
          <div className="bg-white dark:bg-card rounded-xl border border-border/40 shadow-sm overflow-hidden">
            <div className="divide-y divide-border/20">
              {leaderTasks.map((task, index) => (
                <div
                  key={task.id}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 transition-all",
                    index % 2 === 0 
                      ? "bg-white dark:bg-card" 
                      : "bg-gray-50/50 dark:bg-muted/10"
                  )}
                >
                  {/* Task title */}
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      "text-sm font-medium",
                      task.status === 'yes' && "text-green-700 dark:text-green-400",
                      task.status === 'no' && "text-red-600 dark:text-red-400 line-through opacity-70"
                    )}>
                      {task.item_title}
                    </p>
                  </div>

                  {/* 3-state compact toggle */}
                  <div className="flex items-center bg-muted/50 rounded-full p-0.5 h-7 shrink-0">
                    <button
                      onClick={() => handleLeaderStatusChange(task.id, task.status === 'no' ? null : 'no')}
                      className={cn(
                        "px-2.5 py-1 rounded-full text-xs font-medium transition-all",
                        task.status === 'no' 
                          ? "bg-red-500 text-white" 
                          : "text-muted-foreground hover:text-red-500"
                      )}
                    >
                      No
                    </button>
                    <div className={cn(
                      "w-1.5 h-1.5 rounded-full mx-1 transition-all",
                      task.status === null ? "bg-muted-foreground/50" : "bg-transparent"
                    )} />
                    <button
                      onClick={() => handleLeaderStatusChange(task.id, task.status === 'yes' ? null : 'yes')}
                      className={cn(
                        "px-2.5 py-1 rounded-full text-xs font-medium transition-all",
                        task.status === 'yes' 
                          ? "bg-green-500 text-white" 
                          : "text-muted-foreground hover:text-green-500"
                      )}
                    >
                      Yes
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Summary footer */}
            <div className="px-4 py-3 bg-muted/30 border-t border-border/30">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">
                  {leaderTasks.filter(t => t.status === null).length} not marked
                </span>
                <span className="font-medium">
                  {Math.round((leaderCompletedCount / leaderTotalCount) * 100)}% complete
                </span>
              </div>
              {/* Progress bar */}
              <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-green-500 transition-all duration-300"
                  style={{ width: `${(leaderCompletedCount / leaderTotalCount) * 100}%` }}
                />
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
                    "flex items-center gap-3 px-4 py-3 transition-all group",
                    index % 2 === 0 
                      ? "bg-white dark:bg-card" 
                      : "bg-gray-50/50 dark:bg-muted/10"
                  )}
                >
                  {/* Task title */}
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      "text-sm font-medium",
                      task.status === 'yes' && "text-green-700 dark:text-green-400",
                      task.status === 'no' && "text-red-600 dark:text-red-400 line-through opacity-70"
                    )}>
                      {task.title}
                    </p>
                  </div>

                  {/* Delete button */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                    onClick={() => deleteUserTask(task.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-gray-500" />
                  </Button>

                  {/* 3-state compact toggle */}
                  <div className="flex items-center bg-muted/50 rounded-full p-0.5 h-7 shrink-0">
                    <button
                      onClick={() => handleUserStatusChange(task.id, task.status === 'no' ? null : 'no')}
                      className={cn(
                        "px-2.5 py-1 rounded-full text-xs font-medium transition-all",
                        task.status === 'no' 
                          ? "bg-red-500 text-white" 
                          : "text-muted-foreground hover:text-red-500"
                      )}
                    >
                      No
                    </button>
                    <div className={cn(
                      "w-1.5 h-1.5 rounded-full mx-1 transition-all",
                      task.status === null ? "bg-muted-foreground/50" : "bg-transparent"
                    )} />
                    <button
                      onClick={() => handleUserStatusChange(task.id, task.status === 'yes' ? null : 'yes')}
                      className={cn(
                        "px-2.5 py-1 rounded-full text-xs font-medium transition-all",
                        task.status === 'yes' 
                          ? "bg-green-500 text-white" 
                          : "text-muted-foreground hover:text-green-500"
                      )}
                    >
                      Yes
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Summary footer */}
            <div className="px-4 py-3 bg-muted/30 border-t border-border/30">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">
                  {userTasks.filter(t => t.status === null).length} not marked
                </span>
                <span className="font-medium">
                  {Math.round((userCompletedCount / userTotalCount) * 100)}% complete
                </span>
              </div>
              {/* Progress bar */}
              <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-green-500 transition-all duration-300"
                  style={{ width: `${(userCompletedCount / userTotalCount) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
