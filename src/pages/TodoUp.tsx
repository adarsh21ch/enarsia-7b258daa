import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useProspects } from '@/hooks/useProspects';
import { useSubscription } from '@/hooks/useSubscription';
import { useProspectLimit } from '@/hooks/useProspectLimit';
import { useTodos } from '@/hooks/useTodos';
import { BottomNav } from '@/components/layout/BottomNav';
import { UpgradeBar } from '@/components/subscription/UpgradeBar';
import { PullToRefreshIndicator } from '@/components/PullToRefreshIndicator';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, CheckCircle, Lock, Trash2, Edit2, Send, X, Check } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { Prospect, FunnelStage } from '@/types/prospect';
import nevoraLogo from '@/assets/nevorai-logo.jpeg';
import { toast } from 'sonner';

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
      try { await onRefresh(); } finally { setIsRefreshing(false); }
    }
    setPullDistance(0);
    startY.current = 0;
  }, [pullDistance, threshold, isRefreshing, onRefresh]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: true });
    container.addEventListener('touchend', handleTouchEnd);
    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  return { containerRef, isRefreshing, pullDistance, showIndicator: pullDistance > 20 || isRefreshing };
}

// Only 3 stages now (Level Up removed)
const FUNNEL_STAGES: FunnelStage[] = ['Day 1', 'Day 2', 'Minimum Bill'];

// Stage colors for the horizontal bar segments
const STAGE_COLORS: Record<string, string> = {
  'Day 1': 'bg-gradient-to-r from-indigo-500 to-violet-500',
  'Day 2': 'bg-gradient-to-r from-rose-400 to-pink-500',
  'Minimum Bill': 'bg-gradient-to-r from-emerald-400 to-teal-500',
};

export default function TodoUp() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { prospects, refetch } = useProspects();
  const { isPro, loading: subLoading } = useSubscription();
  const prospectLimit = useProspectLimit(prospects, isPro);
  const { todos, loading: todosLoading, addTodo, updateTodo, toggleTodo, deleteTodo, refetch: refetchTodos } = useTodos();
  const [newTodoInput, setNewTodoInput] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');

  // Show lock only if Free AND at/over 50-prospect limit
  const showLock = !isPro && prospectLimit.isAtLimit;

  // Pull-to-refresh
  const handleRefresh = useCallback(async () => {
    await Promise.all([refetch?.(), refetchTodos?.()]);
  }, [refetch, refetchTodos]);
  const { containerRef, isRefreshing, pullDistance, showIndicator } = usePullToRefresh(handleRefresh);

  useEffect(() => {
    if (!user && !authLoading) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  // Get prospects grouped by the 3 funnel stages we care about
  const funnelProspects = useMemo(() => {
    const result: { prospect: Prospect; stage: FunnelStage }[] = [];
    
    prospects.forEach(p => {
      if (p.funnel_stage && FUNNEL_STAGES.includes(p.funnel_stage as FunnelStage)) {
        result.push({ prospect: p, stage: p.funnel_stage as FunnelStage });
      }
    });
    
    // Sort by stage order
    const stageOrder: Record<string, number> = { 'Day 1': 0, 'Day 2': 1, 'Minimum Bill': 2 };
    result.sort((a, b) => stageOrder[a.stage] - stageOrder[b.stage]);
    
    return result;
  }, [prospects]);

  // Count per stage for badges
  const stageCounts = useMemo(() => {
    const counts: Record<string, number> = { 'Day 1': 0, 'Day 2': 0, 'Minimum Bill': 0 };
    funnelProspects.forEach(({ stage }) => {
      counts[stage] = (counts[stage] || 0) + 1;
    });
    return counts;
  }, [funnelProspects]);

  const handleAddTodo = async () => {
    const todoText = newTodoInput.trim();
    if (!todoText) return;
    
    // Only add if not blocked
    if (showLock) {
      toast.error('Upgrade to Pro to add tasks');
      return;
    }
    
    const result = await addTodo(todoText);
    if (result) {
      setNewTodoInput('');
    }
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

  if (authLoading || subLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="app-layout bg-gradient-to-b from-background via-background to-muted/20">
      <header className="fixed-header z-40 bg-card/80 backdrop-blur-xl border-b border-border/50">
        <div className="flex items-center px-4 py-3">
          <div className="flex items-center gap-3">
            <img 
              src={nevoraLogo} 
              alt="NevorAI Logo" 
              className="h-10 w-10 rounded-xl object-cover shadow-md"
            />
            <div>
              <h1 className="text-xl font-bold tracking-tight">To-Do Up</h1>
              <p className="text-xs text-muted-foreground font-medium">Your To-Do List & Reminders</p>
            </div>
          </div>
        </div>
      </header>

      <main ref={containerRef} className="scrollable-content relative pb-36">
        <PullToRefreshIndicator isRefreshing={isRefreshing} pullDistance={pullDistance} showIndicator={showIndicator} />
        <div className="container py-3 px-4 space-y-4">
          {/* Lock overlay only shows when Free AND at/over 50-prospect limit */}
          {showLock && (
            <div className="relative mb-4">
              <div className="flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm rounded-2xl py-12 border border-border/30">
                <div className="p-4 rounded-full bg-muted mb-4">
                  <Lock className="h-10 w-10 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Pro Feature</h3>
                <p className="text-sm text-muted-foreground max-w-xs text-center px-4">
                  You've reached the free limit of {prospectLimit.limit} prospects. Subscribe for ₹249 to unlock all features.
                </p>
              </div>
            </div>
          )}

          {/* Funnel Stage Overview - Single horizontal bar with 3 segments */}
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground font-medium px-1">
              Funnel Stage Overview
            </p>
            
            {/* Horizontal bar with 3 colored segments */}
            <div className="rounded-xl overflow-hidden border border-border/40 shadow-sm bg-white dark:bg-card">
              {/* Header bar with 3 segments */}
              <div className="flex">
                {FUNNEL_STAGES.map((stage, index) => (
                  <div
                    key={stage}
                    className={cn(
                      "flex-1 px-3 py-2 flex items-center justify-between gap-1",
                      STAGE_COLORS[stage],
                      index < FUNNEL_STAGES.length - 1 && "border-r border-white/20"
                    )}
                  >
                    <span className="text-xs font-semibold text-white truncate">
                      {stage === 'Minimum Bill' ? 'Min Bill' : stage}
                    </span>
                    <span className="text-xs font-bold bg-white/90 text-gray-700 min-w-[20px] h-5 flex items-center justify-center rounded-full px-1.5">
                      {stageCounts[stage]}
                    </span>
                  </div>
                ))}
              </div>
              
              {/* Compact prospect list - one line per prospect */}
              <div className="p-3 max-h-48 overflow-y-auto">
                {funnelProspects.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">
                    No prospects yet
                  </p>
                ) : (
                  <div className="space-y-1">
                    {funnelProspects.map(({ prospect, stage }, index) => (
                      <div
                        key={prospect.id}
                        className="flex items-center gap-2 text-sm py-1 px-1 rounded hover:bg-muted/30 transition-colors"
                      >
                        <span className="text-muted-foreground/70 text-xs w-5 shrink-0">{index + 1}.</span>
                        <span className="font-medium text-foreground truncate flex-1">{prospect.name}</span>
                        <span className={cn(
                          "text-xs px-2 py-0.5 rounded-full shrink-0",
                          stage === 'Day 1' && "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300",
                          stage === 'Day 2' && "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300",
                          stage === 'Minimum Bill' && "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                        )}>
                          {stage === 'Minimum Bill' ? 'Min Bill' : stage}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* To-Do List - Track Up table style */}
          <div className="bg-white dark:bg-card rounded-xl border border-border/40 shadow-sm overflow-hidden">
            {/* Header row like Track Up */}
            <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 dark:bg-muted/30 border-b border-border/30">
              <CheckCircle className="h-4 w-4 text-gray-600 dark:text-gray-400" />
              <h3 className="font-semibold text-sm text-gray-800 dark:text-gray-200">My To-Do List</h3>
            </div>

            {todosLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : todos.length === 0 ? (
              <div className="py-8 px-4">
                <p className="text-sm text-muted-foreground text-center">
                  No tasks yet. Add one below!
                </p>
              </div>
            ) : (
              <div className="max-h-[40vh] overflow-y-auto divide-y divide-border/20">
                {todos.map((todo, index) => (
                  <div
                    key={todo.id}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 transition-all group",
                      index % 2 === 0 
                        ? "bg-white dark:bg-card" 
                        : "bg-gray-50/50 dark:bg-muted/10",
                      todo.completed && "opacity-60"
                    )}
                  >
                    <Checkbox
                      checked={todo.completed}
                      onCheckedChange={(checked) => toggleTodo(todo.id, !!checked)}
                      className="data-[state=checked]:bg-gray-800 data-[state=checked]:border-gray-800 border-gray-400"
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
                          <p className={cn(
                            "text-sm text-gray-800 dark:text-gray-200",
                            todo.completed && "line-through text-gray-400 dark:text-gray-500"
                          )}>
                            {todo.title}
                          </p>
                          {todo.due_date && (
                            <p className="text-xs text-gray-500 mt-0.5">
                              Due: {format(parseISO(todo.due_date), 'dd MMM yyyy')}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-gray-500 hover:text-gray-800"
                            onClick={() => handleStartEdit(todo.id, todo.title)}
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-gray-500 hover:text-red-600"
                            onClick={() => deleteTodo(todo.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </main>

      {/* Fixed Bottom Input Bar - Always visible, disabled when at limit */}
      <div className="fixed bottom-16 left-0 right-0 z-30 bg-gradient-to-t from-background via-background/98 to-transparent pt-3 pb-2 px-4">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center gap-2 bg-white dark:bg-card border border-gray-300 dark:border-gray-600 rounded-full px-4 py-2 shadow-lg">
            <Input
              placeholder="Add a task or describe what you want to do…"
              value={newTodoInput}
              onChange={(e) => setNewTodoInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newTodoInput.trim() && !showLock) {
                  e.preventDefault();
                  handleAddTodo();
                }
              }}
              disabled={showLock}
              className="flex-1 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-gray-400 text-sm h-9"
            />
            <Button
              size="icon"
              className={cn(
                "h-10 w-10 rounded-full shrink-0 bg-gray-900 hover:bg-gray-800 text-white shadow-md transition-all duration-150",
                "active:scale-95",
                (!newTodoInput.trim() || showLock) && "opacity-50"
              )}
              onClick={handleAddTodo}
              disabled={!newTodoInput.trim() || showLock}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          {showLock && (
            <p className="text-xs text-center text-muted-foreground mt-2">
              Upgrade to Pro to add tasks
            </p>
          )}
        </div>
      </div>

      {/* Upgrade Bar only for Free Users at/over limit */}
      {showLock && <UpgradeBar />}

      <BottomNav />
    </div>
  );
}
