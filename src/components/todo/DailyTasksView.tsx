// Daily Tasks View - Shows leader-assigned template checklist for selected date
import { useDailyTasks } from '@/hooks/useDailyTasks';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, XCircle, Circle, ClipboardList } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface DailyTasksViewProps {
  selectedDate: Date;
  selectedDateString: string;
}

export function DailyTasksView({ selectedDate, selectedDateString }: DailyTasksViewProps) {
  const { tasks, templateName, loading, hasLeader, markTask } = useDailyTasks(selectedDateString);

  const completedCount = tasks.filter(t => t.status === 'yes').length;
  const totalCount = tasks.length;

  const handleStatusChange = async (taskId: string, newStatus: 'yes' | 'no' | null) => {
    await markTask(taskId, newStatus);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!hasLeader) {
    return (
      <div className="py-12 px-4 text-center">
        <ClipboardList className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
        <p className="text-sm font-medium text-muted-foreground mb-1">
          No Leader Connected
        </p>
        <p className="text-xs text-muted-foreground/70">
          Connect to a leader in Profile settings to see daily tasks
        </p>
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="py-12 px-4 text-center">
        <ClipboardList className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
        <p className="text-sm font-medium text-muted-foreground mb-1">
          No Daily Tasks
        </p>
        <p className="text-xs text-muted-foreground/70">
          Your leader hasn't set up tasks for your level yet
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with template name and progress */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground">From Leader:</p>
          <p className="text-sm font-semibold text-primary">{templateName}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Progress</p>
          <p className="text-sm font-semibold">
            <span className="text-green-600">{completedCount}</span>
            <span className="text-muted-foreground">/{totalCount}</span>
          </p>
        </div>
      </div>

      {/* Date display */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">
          {format(selectedDate, 'EEEE, MMMM d, yyyy')}
        </h3>
      </div>

      {/* Tasks list */}
      <div className="bg-white dark:bg-card rounded-xl border border-border/40 shadow-sm overflow-hidden">
        <div className="divide-y divide-border/20">
          {tasks.map((task, index) => (
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
                  onClick={() => handleStatusChange(task.id, task.status === 'no' ? null : 'no')}
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
                  onClick={() => handleStatusChange(task.id, task.status === 'yes' ? null : 'yes')}
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
              {tasks.filter(t => t.status === null).length} not marked
            </span>
            <span className="font-medium">
              {Math.round((completedCount / totalCount) * 100)}% complete
            </span>
          </div>
          {/* Progress bar */}
          <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-green-500 transition-all duration-300"
              style={{ width: `${(completedCount / totalCount) * 100}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
