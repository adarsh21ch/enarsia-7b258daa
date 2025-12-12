// To-Do List Page
import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTodos } from '@/hooks/useTodos';
import { useTeamTodos } from '@/hooks/useTeamTodos';
import { useSharedProspects } from '@/hooks/useSharedProspects';
import { BottomNav } from '@/components/layout/BottomNav';
import { PullToRefreshIndicator } from '@/components/PullToRefreshIndicator';
import { TeamMemberSelector } from '@/components/team/TeamMemberSelector';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { SearchBar } from '@/components/ui/SearchBar';
import { Loader2, CheckCircle, Trash2, Edit2, Send, X, Check, Plus, User } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
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

export default function TodoUp() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { todos, loading: todosLoading, addTodo, updateTodo, toggleTodo, deleteTodo, refetch: refetchTodos } = useTodos();
  const { teamTodos, loading: teamTodosLoading, refetch: refetchTeamTodos } = useTeamTodos();
  const { sharedOwners, selectedOwnerIds, toggleOwnerSelection, selectAllOwners, clearSelection, prospectCounts } = useSharedProspects();
  
  const [newTodoInput, setNewTodoInput] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Data view state - derived from selectedOwnerIds (consistent with other tabs)
  const isViewingTeam = selectedOwnerIds.length > 0;

  // Pull-to-refresh
  const handleRefresh = useCallback(async () => {
    if (isViewingTeam) {
      await refetchTeamTodos?.();
    } else {
      await refetchTodos?.();
    }
  }, [isViewingTeam, refetchTodos, refetchTeamTodos]);
  const { containerRef, isRefreshing, pullDistance, showIndicator } = usePullToRefresh(handleRefresh);

  useEffect(() => {
    if (!user && !authLoading) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  const handleAddTodo = async () => {
    const todoText = newTodoInput.trim();
    if (!todoText) return;
    
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

  const handleToggleComplete = async (id: string, completed: boolean) => {
    await toggleTodo(id, completed);
    if (completed) {
      toast.success('Task completed!');
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  if (!user) return null;

  // Get the active todos based on view mode
  // When viewing team: filter teamTodos to only selected team members
  const getFilteredTeamTodos = () => {
    if (selectedOwnerIds.length === 0) return [];
    return teamTodos.filter(todo => selectedOwnerIds.includes(todo.user_id));
  };
  
  const activeTodos = isViewingTeam ? getFilteredTeamTodos() : todos;
  const isLoading = isViewingTeam ? teamTodosLoading : todosLoading;

  // Apply search filter
  const filteredTodos = searchQuery.trim() 
    ? activeTodos.filter(t => t.title.toLowerCase().includes(searchQuery.toLowerCase()))
    : activeTodos;

  // Separate completed and pending todos, sort descending by created_at (most recent at top)
  const pendingTodos = filteredTodos
    .filter(t => !t.completed)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  const completedTodos = filteredTodos
    .filter(t => t.completed)
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

  return (
    <div className="app-layout bg-gradient-to-b from-background via-background to-muted/20">
      <header className="fixed-header z-40 bg-card/80 backdrop-blur-xl border-b border-border/50">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <img 
              src={nevoraLogo} 
              alt="NevorAI Logo" 
              className="h-10 w-10 rounded-xl object-cover shadow-md"
            />
            <div>
              <h1 className="text-xl font-bold tracking-tight">To-Do List</h1>
              <p className="text-xs text-muted-foreground font-medium">Your Tasks & Reminders</p>
            </div>
          </div>
          {/* Team Toggle */}
          <TeamMemberSelector
            sharedOwners={sharedOwners}
            selectedOwnerIds={selectedOwnerIds}
            onToggleOwner={toggleOwnerSelection}
            onSelectAll={selectAllOwners}
            onClear={clearSelection}
            currentTab="todo"
            prospectCounts={prospectCounts}
          />
        </div>
      </header>

      <main ref={containerRef} className="scrollable-content relative pb-24">
        <PullToRefreshIndicator isRefreshing={isRefreshing} pullDistance={pullDistance} showIndicator={showIndicator} />
        <div className="container py-3 px-4 space-y-4">
          {/* WhatsApp-style Search Bar */}
          <div className="mb-1">
            <SearchBar 
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search to-do items..."
            />
          </div>

          {/* To-Do List */}
          <div className="bg-white dark:bg-card rounded-xl border border-border/40 shadow-sm overflow-hidden">
            {/* Header row */}
            <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 dark:bg-muted/30 border-b border-border/30">
              <CheckCircle className="h-4 w-4 text-gray-600 dark:text-gray-400" />
              <h3 className="font-semibold text-sm text-gray-800 dark:text-gray-200">
                {isViewingTeam ? 'Team To-Do List' : 'My To-Do List'}
              </h3>
              <span className="ml-auto text-xs text-muted-foreground">
                {pendingTodos.length} pending
              </span>
            </div>

            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : filteredTodos.length === 0 ? (
              <div className="py-12 px-4 text-center">
                <CheckCircle className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-sm font-medium text-muted-foreground mb-1">
                  {searchQuery.trim() 
                    ? 'No matching tasks' 
                    : isViewingTeam 
                      ? 'No team tasks yet' 
                      : 'No tasks yet'}
                </p>
                <p className="text-xs text-muted-foreground/70 mb-4">
                  {searchQuery.trim() 
                    ? 'Try a different search term'
                    : isViewingTeam 
                      ? 'Team members have no tasks' 
                      : 'Add your first to-do below'}
                </p>
                {!isViewingTeam && !searchQuery.trim() && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => document.getElementById('todo-input')?.focus()}
                    className="gap-1"
                  >
                    <Plus className="h-4 w-4" />
                    Add To-Do
                  </Button>
                )}
              </div>
            ) : (
              <div className="divide-y divide-border/20">
                {/* Pending todos first - sorted descending (most recent at top) */}
                {pendingTodos.map((todo, index) => {
                  const ownerName = (todo as any).owner_name;
                  const isTeamTodo = isViewingTeam && ownerName;
                  
                  return (
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
                        onCheckedChange={isTeamTodo ? undefined : (checked) => handleToggleComplete(todo.id, !!checked)}
                        disabled={isTeamTodo}
                        className="mt-1 data-[state=checked]:bg-gray-800 data-[state=checked]:border-gray-800 border-gray-400"
                      />
                      
                      {editingId === todo.id && !isTeamTodo ? (
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
                            <div className="flex items-center gap-2 mt-0.5">
                              {isTeamTodo && (
                                <span className="inline-flex items-center gap-1 text-xs text-primary">
                                  <User className="h-3 w-3" />
                                  {ownerName}
                                </span>
                              )}
                              <p className="text-xs text-muted-foreground">
                                Created {format(parseISO(todo.created_at), 'MMM d, h:mm a')}
                              </p>
                            </div>
                          </div>
                          {!isTeamTodo && (
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
                          )}
                        </>
                      )}
                    </div>
                  );
                })}

                {/* Completed todos */}
                {completedTodos.length > 0 && (
                  <>
                    <div className="px-4 py-2 bg-muted/30">
                      <p className="text-xs font-medium text-muted-foreground">
                        Completed ({completedTodos.length})
                      </p>
                    </div>
                    {completedTodos.map((todo) => {
                      const ownerName = (todo as any).owner_name;
                      const isTeamTodo = isViewingTeam && ownerName;
                      
                      return (
                        <div
                          key={todo.id}
                          className="flex items-start gap-3 px-4 py-3 transition-all group opacity-60"
                        >
                          <Checkbox
                            checked={todo.completed}
                            onCheckedChange={isTeamTodo ? undefined : (checked) => handleToggleComplete(todo.id, !!checked)}
                            disabled={isTeamTodo}
                            className="mt-1 data-[state=checked]:bg-gray-800 data-[state=checked]:border-gray-800 border-gray-400"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground line-through">
                              {todo.title}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5">
                              {isTeamTodo && (
                                <span className="inline-flex items-center gap-1 text-xs text-primary">
                                  <User className="h-3 w-3" />
                                  {ownerName}
                                </span>
                              )}
                              <p className="text-xs text-muted-foreground">
                                Completed {format(parseISO(todo.updated_at), 'MMM d, h:mm a')}
                              </p>
                            </div>
                          </div>
                          {!isTeamTodo && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 opacity-0 group-hover:opacity-100"
                              onClick={() => deleteTodo(todo.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5 text-gray-500" />
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Fixed bottom chat-style input - floating overlay (only show for personal todos) */}
      {!isViewingTeam && (
        <div className="fixed bottom-14 left-0 right-0 z-30 px-4 pb-3 pt-2 pointer-events-none">
          <div className="pointer-events-auto max-w-lg mx-auto">
            <div className="flex items-center gap-2 bg-card/95 backdrop-blur-xl border border-border/50 rounded-full px-4 py-2 shadow-lg">
              <input
                id="todo-input"
                type="text"
                placeholder="Add a to-do task or reminder..."
                value={newTodoInput}
                onChange={(e) => setNewTodoInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddTodo();
                }}
                className="flex-1 bg-transparent border-0 outline-none text-sm placeholder:text-muted-foreground/60"
              />
              <Button
                onClick={handleAddTodo}
                disabled={!newTodoInput.trim()}
                size="icon"
                className="h-8 w-8 rounded-full shrink-0"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}