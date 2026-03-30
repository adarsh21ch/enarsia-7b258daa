// To-Do List Page - Personal todos with calendar strip + Daily Tasks from leader + Recent Activity
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useGlobalTodos } from '@/contexts/TodosContext';
import { useUserDailyTasks } from '@/hooks/useUserDailyTasks';
import { useSwipeTabs } from '@/hooks/useSwipeTabs';
import { BottomNav } from '@/components/layout/BottomNav';

import { PullToRefreshIndicator } from '@/components/PullToRefreshIndicator';
import { CalendarStrip } from '@/components/calendar/CalendarStrip';
import { useCalendarStrip } from '@/hooks/useCalendarStrip';
import { DailyTasksView } from '@/components/todo/DailyTasksView';
import { RecentActivityView } from '@/components/todo/RecentActivityView';
import { TopTabBar } from '@/components/ui/TopTabBar';
import { TrialBanner } from '@/components/subscription/TrialBanner';
import { UpgradeButton } from '@/components/subscription/UpgradeButton';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, CheckCircle, Trash2, Edit2, Send, X, Check, Plus, StickyNote, ListChecks, CalendarCheck } from 'lucide-react';
import { format, parseISO, isSameDay } from 'date-fns';
import { cn } from '@/lib/utils';
import nevoraLogo from '@/assets/nevorai-logo.jpeg';
import { toast } from 'sonner';
type ViewMode = 'daily-tasks' | 'todo-list' | 'recent-activity';

// Pull-to-refresh hook
function usePullToRefresh(onRefresh: () => Promise<void>, threshold = 80) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const startY = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (containerRef.current && containerRef.current.scrollTop === 0) {
      startY.current = e.touches[0].clientY;
    }
  }, []);
  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!startY.current || isRefreshing) return;
    const currentY = e.touches[0].clientY;
    const diff = currentY - startY.current;
    if (diff > 0 && containerRef.current && containerRef.current.scrollTop === 0) {
      setPullDistance(Math.min(diff * 0.5, threshold * 1.5));
    }
  }, [isRefreshing, threshold]);
  const handleTouchEnd = useCallback(async () => {
    if (pullDistance >= threshold && !isRefreshing) {
      setIsRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
      }
    }
    setPullDistance(0);
    startY.current = 0;
  }, [pullDistance, threshold, isRefreshing, onRefresh]);
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    container.addEventListener('touchstart', handleTouchStart, {
      passive: true
    });
    container.addEventListener('touchmove', handleTouchMove, {
      passive: true
    });
    container.addEventListener('touchend', handleTouchEnd);
    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);
  return {
    containerRef,
    isRefreshing,
    pullDistance,
    showIndicator: pullDistance > 20 || isRefreshing
  };
}
export default function TodoUp() {
  const navigate = useNavigate();
  const {
    user,
    loading: authLoading
  } = useAuth();
  const {
    todos,
    loading: todosLoading,
    addTodo,
    updateTodo,
    toggleTodo,
    deleteTodo,
    refetch: refetchTodos
  } = useGlobalTodos();

  // Calendar strip state
  const calendar = useCalendarStrip();

  // User daily tasks hook for recurring tasks
  const {
    tasks: userDailyTasks,
    loading: userDailyTasksLoading,
    addTask: addDailyTask,
    deleteTask: deleteDailyTask,
    markTask: markDailyTask,
    refetch: refetchDailyTasks
  } = useUserDailyTasks(calendar.selectedDateString);
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const saved = localStorage.getItem('nevorai-todoup-tab');
    if (saved === 'daily-tasks' || saved === 'todo-list') return saved;
    return 'daily-tasks';
  });
  const [previousViewMode, setPreviousViewMode] = useState<'todo-list' | 'daily-tasks'>(() => {
    const saved = localStorage.getItem('nevorai-todoup-tab');
    if (saved === 'daily-tasks' || saved === 'todo-list') return saved;
    return 'daily-tasks';
  });
  const [newTodoInput, setNewTodoInput] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [activitySearchQuery, setActivitySearchQuery] = useState('');

  // Toggle Recent Activity view
  const toggleRecentActivity = () => {
    if (viewMode === 'recent-activity') {
      setViewMode(previousViewMode);
    } else {
      setPreviousViewMode(viewMode === 'todo-list' || viewMode === 'daily-tasks' ? viewMode : 'todo-list');
      setViewMode('recent-activity');
    }
  };

  // Handle tab change (only for todo-list and daily-tasks)
  const handleTabChange = (value: string) => {
    if (value === 'todo-list' || value === 'daily-tasks') {
      setViewMode(value);
      setPreviousViewMode(value);
      localStorage.setItem('nevorai-todoup-tab', value);
    }
  };

  // Swipe to switch tabs (only between todo-list and daily-tasks)
  const {
    containerRef: swipeRef
  } = useSwipeTabs({
    onSwipeLeft: () => viewMode !== 'recent-activity' && setViewMode('todo-list'),
    onSwipeRight: () => viewMode !== 'recent-activity' && setViewMode('daily-tasks')
  });

  // Pull-to-refresh
  const handleRefresh = useCallback(async () => {
    await Promise.all([refetchTodos?.(), refetchDailyTasks?.()]);
  }, [refetchTodos, refetchDailyTasks]);
  const {
    containerRef: pullRef,
    isRefreshing,
    pullDistance,
    showIndicator
  } = usePullToRefresh(handleRefresh);

  // Combine refs
  const mainRef = useCallback((node: HTMLDivElement | null) => {
    (pullRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
    (swipeRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
  }, [pullRef, swipeRef]);
  useEffect(() => {
    if (!user && !authLoading) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  // Filter todos by selected date
  const filteredTodos = useMemo(() => {
    return todos.filter(todo => {
      if (!todo.due_date) return false;
      const todoDate = parseISO(todo.due_date);
      return isSameDay(todoDate, calendar.selectedDate);
    });
  }, [todos, calendar.selectedDate]);

  // Get dates that have tasks for the dot indicators
  const datesWithTasks = useMemo(() => {
    const dateSet = new Set<string>();
    todos.forEach(todo => {
      if (todo.due_date) {
        dateSet.add(todo.due_date);
      }
    });
    return dateSet;
  }, [todos]);

  // Separate completed and pending todos
  const pendingTodos = useMemo(() => filteredTodos.filter(t => !t.completed).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()), [filteredTodos]);
  const completedTodos = useMemo(() => filteredTodos.filter(t => t.completed).sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()), [filteredTodos]);
  const handleAddTask = async () => {
    const taskText = newTodoInput.trim();
    if (!taskText) return;
    if (viewMode === 'daily-tasks') {
      // Add recurring daily task
      const result = await addDailyTask(taskText);
      if (result) {
        setNewTodoInput('');
      }
    } else if (viewMode === 'todo-list') {
      // Add one-time todo with selected date
      const result = await addTodo(taskText, calendar.selectedDateString);
      if (result) {
        setNewTodoInput('');
      }
    }
  };
  const handleStartEdit = (id: string, title: string) => {
    setEditingId(id);
    setEditingTitle(title);
  };
  const handleSaveEdit = async () => {
    if (!editingId || !editingTitle.trim()) return;
    await updateTodo(editingId, {
      title: editingTitle.trim()
    });
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
  if (authLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>;
  }
  if (!user) return null;
  const isRecentActivity = viewMode === 'recent-activity';
  return <div className="app-layout bg-gradient-to-b from-background via-background to-muted/20">
      <header className="fixed-header z-40 bg-card/80 backdrop-blur-xl border-b border-border/40">
        <div className="flex items-center justify-between px-4 py-2.5">
          <div className="flex items-center gap-2.5">
            <img src={nevoraLogo} alt="NevorAI Logo" className="h-9 w-9 rounded-xl object-cover shadow-sm" />
            <div>
              <h1 className="text-lg font-bold tracking-tight">
                {isRecentActivity ? 'Activity History' : 'To-Do List'}
              </h1>
              <p className="text-[11px] text-muted-foreground font-medium">
                {isRecentActivity ? "Today's Updates" : 'Your Tasks & Reminders'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {/* Notes Button */}
            <Button variant="ghost" size="icon" onClick={() => navigate('/notes')} className="h-10 w-10 rounded-full">
              <StickyNote className="h-[22px] w-[22px]" />
            </Button>
            
          </div>
        </div>

        {/* Segmented Control - Hidden when Recent Activity is active */}
        {!isRecentActivity && <div className="px-4 pb-2">
            <TopTabBar 
              options={[
                { value: 'daily-tasks', label: 'Daily Tasks', icon: CalendarCheck },
                { value: 'todo-list', label: 'To-Do List', icon: ListChecks },
              ]} 
              value={viewMode} 
              onChange={handleTabChange} 
            />
          </div>}
      </header>

      {/* Calendar Strip - Fixed below header */}
      <div className={cn("fixed left-0 right-0 z-30", isRecentActivity ? "top-[72px]" : "top-[108px]")}>
        <CalendarStrip selectedDate={calendar.selectedDate} daysInMonth={calendar.daysInMonth} monthYearLabel={calendar.monthYearLabel} onSelectDate={calendar.selectDate} onPreviousMonth={calendar.goToPreviousMonth} onNextMonth={calendar.goToNextMonth} onTodayClick={calendar.goToToday} datesWithTasks={datesWithTasks} />
      </div>

      <main ref={mainRef} className={cn("scrollable-content relative pb-24", isRecentActivity ? "pt-[90px]" : "pt-[90px]")}>
        <PullToRefreshIndicator isRefreshing={isRefreshing} pullDistance={pullDistance} showIndicator={showIndicator} />
        <div className="container px-4 space-y-2">
          {/* Trial Banner - respects admin config */}
          <TrialBanner tabId="todoup" />
          <UpgradeButton tabId="todoup" variant="prominent" />
          
          {/* Recent Activity View */}
          {isRecentActivity && <RecentActivityView selectedDate={calendar.selectedDate} searchQuery={activitySearchQuery} onSearchChange={setActivitySearchQuery} hideCalendar />}

          {/* Daily Tasks View */}
          {viewMode === 'daily-tasks' && <DailyTasksView selectedDate={calendar.selectedDate} selectedDateString={calendar.selectedDateString} userTasks={userDailyTasks} userTasksLoading={userDailyTasksLoading} markUserTask={markDailyTask} deleteUserTask={deleteDailyTask} />}

          {/* To-Do List View (existing UI) */}
          {viewMode === 'todo-list' && <>
              {/* Selected date display */}
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-muted-foreground">
                  {format(calendar.selectedDate, 'EEEE, MMMM d, yyyy')}
                </h3>
                <span className="text-xs text-muted-foreground">
                  {pendingTodos.length} pending
                </span>
              </div>

              {/* To-Do List */}
              <div className="bg-card rounded-xl border border-border/40 shadow-sm overflow-hidden">
                {todosLoading ? <div className="flex justify-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div> : filteredTodos.length === 0 ? <div className="py-12 px-4 text-center">
                    <CheckCircle className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                    <p className="text-sm font-medium text-muted-foreground mb-1">
                      No tasks for this date
                    </p>
                    <p className="text-xs text-muted-foreground/70 mb-4">
                      Add a to-do for {format(calendar.selectedDate, 'MMM d')}
                    </p>
                    <Button variant="outline" size="sm" onClick={() => document.getElementById('todo-input')?.focus()} className="gap-1">
                      <Plus className="h-4 w-4" />
                      Add To-Do
                    </Button>
                  </div> : <div className="divide-y divide-border/20">
                    {/* Pending todos first */}
                    {pendingTodos.map((todo, index) => <div key={todo.id} className={cn("flex items-start gap-3 px-4 py-3 transition-all group", index % 2 === 0 ? "bg-card" : "bg-muted/10")}>
                        <Checkbox checked={todo.completed} onCheckedChange={checked => handleToggleComplete(todo.id, !!checked)} className="mt-1 data-[state=checked]:bg-foreground data-[state=checked]:border-foreground border-muted-foreground" />
                        
                        {editingId === todo.id ? <div className="flex-1 flex items-center gap-2">
                            <Input value={editingTitle} onChange={e => setEditingTitle(e.target.value)} className="h-8 text-sm border-border" autoFocus onKeyDown={e => {
                    if (e.key === 'Enter') handleSaveEdit();
                    if (e.key === 'Escape') handleCancelEdit();
                  }} />
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleSaveEdit}>
                              <Check className="h-4 w-4 text-primary" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleCancelEdit}>
                              <X className="h-4 w-4 text-muted-foreground" />
                            </Button>
                          </div> : <>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground">
                                {todo.title}
                              </p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                Created {format(parseISO(todo.created_at), 'h:mm a')}
                              </p>
                            </div>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleStartEdit(todo.id, todo.title)}>
                                <Edit2 className="h-3.5 w-3.5 text-muted-foreground" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteTodo(todo.id)}>
                                <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                              </Button>
                            </div>
                          </>}
                      </div>)}

                    {/* Completed todos */}
                    {completedTodos.length > 0 && <>
                        <div className="px-4 py-2 bg-muted/30">
                          <p className="text-xs font-medium text-muted-foreground">
                            Completed ({completedTodos.length})
                          </p>
                        </div>
                        {completedTodos.map(todo => <div key={todo.id} className="flex items-start gap-3 px-4 py-3 transition-all group opacity-60">
                            <Checkbox checked={todo.completed} onCheckedChange={checked => handleToggleComplete(todo.id, !!checked)} className="mt-1 data-[state=checked]:bg-foreground data-[state=checked]:border-foreground border-muted-foreground" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground line-through">
                                {todo.title}
                              </p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                Completed {format(parseISO(todo.updated_at), 'h:mm a')}
                              </p>
                            </div>
                            <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100" onClick={() => deleteTodo(todo.id)}>
                              <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                            </Button>
                          </div>)}
                      </>}
                  </div>}
              </div>
            </>}
        </div>
      </main>

      {/* Fixed bottom chat-style input - show for todo-list and daily-tasks only */}
      {!isRecentActivity && <div className="fixed bottom-14 left-0 right-0 z-30 px-4 pb-3 pt-2 pointer-events-none">
          <div className="pointer-events-auto max-w-lg mx-auto py-[10px]">
            <div className="gap-2 bg-card/95 backdrop-blur-xl border border-border/50 rounded-full px-4 py-2 shadow-lg flex items-center justify-start">
              <input id="todo-input" type="text" placeholder={viewMode === 'daily-tasks' ? 'Add recurring daily task...' : `Add task for ${format(calendar.selectedDate, 'MMM d')}...`} value={newTodoInput} onChange={e => setNewTodoInput(e.target.value)} onKeyDown={e => {
            if (e.key === 'Enter') handleAddTask();
          }} className="flex-1 bg-transparent border-0 outline-none text-sm placeholder:text-muted-foreground/60" />
              <Button onClick={handleAddTask} disabled={!newTodoInput.trim()} size="icon" className="h-8 w-8 rounded-full shrink-0">
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>}

      <BottomNav />
    </div>;
}