// Daily Tasks View - Shows leader-assigned template checklist + user todos for selected date
import { useMemo, useState } from 'react';
import { useDailyTasks } from '@/hooks/useDailyTasks';
import { useGlobalTodos } from '@/contexts/TodosContext';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Loader2, ClipboardList, Edit2, Trash2, Check, X, ListTodo } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, parseISO, isSameDay } from 'date-fns';
import { toast } from 'sonner';

interface DailyTasksViewProps {
  selectedDate: Date;
  selectedDateString: string;
}

export function DailyTasksView({ selectedDate, selectedDateString }: DailyTasksViewProps) {
  const { tasks, templateName, loading, hasLeader, markTask } = useDailyTasks(selectedDateString);
  const { todos, loading: todosLoading, updateTodo, toggleTodo, deleteTodo } = useGlobalTodos();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');

  // Filter user todos by selected date
  const userTodos = useMemo(() => {
    return todos.filter(todo => {
      if (!todo.due_date) return false;
      const todoDate = parseISO(todo.due_date);
      return isSameDay(todoDate, selectedDate);
    });
  }, [todos, selectedDate]);

  const pendingUserTodos = useMemo(() => 
    userTodos.filter(t => !t.completed).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    [userTodos]
  );
  
  const completedUserTodos = useMemo(() => 
    userTodos.filter(t => t.completed).sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()),
    [userTodos]
  );

  const leaderCompletedCount = tasks.filter(t => t.status === 'yes').length;
  const leaderTotalCount = tasks.length;

  const handleStatusChange = async (taskId: string, newStatus: 'yes' | 'no' | null) => {
    await markTask(taskId, newStatus);
  };

  const handleStartEdit = (id: string, title: string) => {
    setEditingId(id);
    setEditingTitle(title);
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editingTitle.trim()) return;
    await updateTodo(editingId, { title: editingTitle.trim() });
    setEditingId(null);
    setEditingTitle('');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingTitle('');
  };

  const handleToggleComplete = async (id: string, completed: boolean) => {
    await toggleTodo(id, completed);
    if (completed) {
      toast.success('Task completed!');
    }
  };

  if (loading || todosLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const hasLeaderTasks = hasLeader && tasks.length > 0;
  const hasUserTodos = userTodos.length > 0;
  const showEmptyState = !hasLeaderTasks && !hasUserTodos;

  if (showEmptyState) {
    return (
      <div className="py-12 px-4 text-center">
        <ClipboardList className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
        <p className="text-sm font-medium text-muted-foreground mb-1">
          No Tasks for This Date
        </p>
        <p className="text-xs text-muted-foreground/70">
          Add a task using the input below
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Date display */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">
          {format(selectedDate, 'EEEE, MMMM d, yyyy')}
        </h3>
      </div>

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

      {/* User's Personal Todos Section */}
      {hasUserTodos && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <ListTodo className="h-4 w-4 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">My Personal Tasks</p>
            <span className="text-xs text-muted-foreground ml-auto">
              {pendingUserTodos.length} pending
            </span>
          </div>

          <div className="bg-white dark:bg-card rounded-xl border border-border/40 shadow-sm overflow-hidden">
            <div className="divide-y divide-border/20">
              {/* Pending todos */}
              {pendingUserTodos.map((todo, index) => (
                <div
                  key={todo.id}
                  className={cn(
                    "flex items-start gap-3 px-4 py-3 transition-all group",
                    index % 2 === 0 
                      ? "bg-white dark:bg-card" 
                      : "bg-gray-50/50 dark:bg-muted/10"
                  )}
                >
                  <Checkbox
                    checked={todo.completed}
                    onCheckedChange={(checked) => handleToggleComplete(todo.id, !!checked)}
                    className="mt-1 data-[state=checked]:bg-gray-800 data-[state=checked]:border-gray-800 border-gray-400"
                  />
                  
                  {editingId === todo.id ? (
                    <div className="flex-1 flex items-center gap-2">
                      <Input
                        value={editingTitle}
                        onChange={(e) => setEditingTitle(e.target.value)}
                        className="h-8 text-sm border-gray-300"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveEdit();
                          if (e.key === 'Escape') handleCancelEdit();
                        }}
                      />
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleSaveEdit}>
                        <Check className="h-4 w-4 text-green-600" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleCancelEdit}>
                        <X className="h-4 w-4 text-gray-500" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">
                          {todo.title}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Added {format(parseISO(todo.created_at), 'h:mm a')}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => handleStartEdit(todo.id, todo.title)}
                        >
                          <Edit2 className="h-3.5 w-3.5 text-gray-500" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => deleteTodo(todo.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-gray-500" />
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              ))}

              {/* Completed todos */}
              {completedUserTodos.length > 0 && (
                <>
                  <div className="px-4 py-2 bg-muted/30">
                    <p className="text-xs font-medium text-muted-foreground">
                      Completed ({completedUserTodos.length})
                    </p>
                  </div>
                  {completedUserTodos.map((todo) => (
                    <div
                      key={todo.id}
                      className="flex items-start gap-3 px-4 py-3 transition-all group opacity-60"
                    >
                      <Checkbox
                        checked={todo.completed}
                        onCheckedChange={(checked) => handleToggleComplete(todo.id, !!checked)}
                        className="mt-1 data-[state=checked]:bg-gray-800 data-[state=checked]:border-gray-800 border-gray-400"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground line-through">
                          {todo.title}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Completed {format(parseISO(todo.updated_at), 'h:mm a')}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 opacity-0 group-hover:opacity-100"
                        onClick={() => deleteTodo(todo.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-gray-500" />
                      </Button>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
