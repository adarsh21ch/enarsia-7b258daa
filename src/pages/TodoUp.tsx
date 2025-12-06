import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useProspects } from '@/hooks/useProspects';
import { useSubscription } from '@/hooks/useSubscription';
import { useTodos } from '@/hooks/useTodos';
import { BottomNav } from '@/components/layout/BottomNav';
import { UpgradeBar } from '@/components/subscription/UpgradeBar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, CheckCircle, Lock, Trash2, Edit2, Send, X, Check, Phone, MessageCircle, Plus, GripVertical } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { Prospect, FunnelStage } from '@/types/prospect';
import nevoraLogo from '@/assets/nevorai-logo.jpeg';
import { toast } from 'sonner';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  useDroppable,
  useDraggable,
} from '@dnd-kit/core';

const FUNNEL_COLUMNS: FunnelStage[] = ['Day 1', 'Day 2', 'Minimum Bill', 'Level Up'];

interface MiniReportCardProps {
  prospect: Prospect;
  onAddTodo: (text: string) => void;
}

function MiniReportCard({ prospect, onAddTodo }: MiniReportCardProps) {
  const handleCall = () => {
    window.location.href = `tel:${prospect.phone}`;
  };

  const handleWhatsApp = () => {
    const phone = prospect.phone.replace(/\D/g, '');
    window.location.href = `whatsapp://send?phone=${phone}`;
  };

  const handleAddTodoClick = () => {
    onAddTodo(`Follow up with ${prospect.name} (Stage: ${prospect.funnel_stage || 'N/A'})...`);
  };

  return (
    <div className="mt-2 p-3 bg-accent/5 rounded-lg border border-accent/20 animate-in fade-in slide-in-from-top-2 duration-200">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="font-semibold text-sm text-foreground">{prospect.name}</h4>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-50"
              onClick={handleCall}
            >
              <Phone className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-50"
              onClick={handleWhatsApp}
            >
              <MessageCircle className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
          <div>
            <span className="text-muted-foreground">Phone:</span>
            <span className="ml-1 font-medium">{prospect.phone || '–'}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Age/Gender:</span>
            <span className="ml-1 font-medium">
              {prospect.age_or_dob || '–'} / {prospect.gender || '–'}
            </span>
          </div>
          <div className="col-span-2">
            <span className="text-muted-foreground">Address:</span>
            <span className="ml-1 font-medium">{prospect.address || '–'}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Stage:</span>
            <span className="ml-1 font-medium text-accent">{prospect.funnel_stage || '–'}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Action:</span>
            <span className="ml-1 font-medium">{prospect.action_taken || '–'}</span>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          className="w-full mt-2 h-7 text-xs border-accent/30 text-accent hover:bg-accent/10"
          onClick={handleAddTodoClick}
        >
          <Plus className="h-3 w-3 mr-1" />
          Add To-Do for this prospect
        </Button>
      </div>
    </div>
  );
}

interface DraggableProspectProps {
  prospect: Prospect;
  isExpanded: boolean;
  onToggleExpand: (prospectId: string) => void;
  onAddTodo: (text: string) => void;
}

function DraggableProspect({ prospect, isExpanded, onToggleExpand, onAddTodo }: DraggableProspectProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: prospect.id,
    data: { prospect },
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  return (
    <div ref={setNodeRef} style={style} className={cn(isDragging && "opacity-50")}>
      <div
        className={cn(
          "flex items-center gap-1 px-2 py-1.5 rounded-lg text-sm font-medium transition-colors",
          "hover:bg-accent/10 group",
          isExpanded && "bg-accent/10"
        )}
      >
        <button
          {...attributes}
          {...listeners}
          className="touch-none cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity p-0.5"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
        <button
          onClick={() => onToggleExpand(prospect.id)}
          className="flex-1 text-left truncate"
        >
          {prospect.name}
        </button>
      </div>
      
      {isExpanded && (
        <MiniReportCard prospect={prospect} onAddTodo={onAddTodo} />
      )}
    </div>
  );
}

interface FunnelColumnProps {
  stage: string;
  prospects: Prospect[];
  isPro: boolean;
  expandedProspectId: string | null;
  onToggleExpand: (prospectId: string) => void;
  onAddTodo: (text: string) => void;
  isOver: boolean;
}

function FunnelColumn({ stage, prospects, isPro, expandedProspectId, onToggleExpand, onAddTodo, isOver }: FunnelColumnProps) {
  const { setNodeRef } = useDroppable({
    id: stage,
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "bg-accent/5 rounded-xl overflow-hidden border transition-all",
        isOver 
          ? "border-accent shadow-lg ring-2 ring-accent/30" 
          : "border-accent/10 hover:shadow-md"
      )}
    >
      {/* Header */}
      <div className="bg-accent text-accent-foreground px-3 py-2">
        <p className="text-xs font-semibold truncate">{stage}</p>
        <p className="text-lg font-bold">{isPro ? prospects.length : '–'}</p>
      </div>
      
      {/* Prospect Names */}
      <div className={cn(
        "p-2 max-h-48 overflow-y-auto space-y-1",
        isOver && "bg-accent/10"
      )}>
        {!isPro ? (
          <p className="text-xs text-muted-foreground text-center py-4">Upgrade to view</p>
        ) : prospects.length === 0 ? (
          <p className={cn(
            "text-xs text-center py-4",
            isOver ? "text-accent font-medium" : "text-muted-foreground"
          )}>
            {isOver ? "Drop here" : "No prospects"}
          </p>
        ) : (
          prospects.map((prospect) => (
            <DraggableProspect
              key={prospect.id}
              prospect={prospect}
              isExpanded={expandedProspectId === prospect.id}
              onToggleExpand={onToggleExpand}
              onAddTodo={onAddTodo}
            />
          ))
        )}
      </div>
    </div>
  );
}

export default function TodoUp() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { prospects, updateProspect } = useProspects();
  const { isPro, loading: subLoading } = useSubscription();
  const { todos, loading: todosLoading, addTodo, updateTodo, toggleTodo, deleteTodo } = useTodos();
  const [newTodoInput, setNewTodoInput] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [expandedProspectId, setExpandedProspectId] = useState<string | null>(null);
  const [activeProspect, setActiveProspect] = useState<Prospect | null>(null);
  const [overColumnId, setOverColumnId] = useState<string | null>(null);

  // Configure sensors for drag-and-drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200,
        tolerance: 5,
      },
    })
  );

  useEffect(() => {
    if (!user && !authLoading) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  // Group prospects by funnel stage - now stores full Prospect objects
  const funnelData = useMemo(() => {
    const groups: Record<string, Prospect[]> = {
      'Day 1': [],
      'Day 2': [],
      'Minimum Bill': [],
      'Level Up': [],
    };
    
    prospects.forEach(p => {
      if (p.funnel_stage && groups[p.funnel_stage] !== undefined) {
        groups[p.funnel_stage].push(p);
      }
    });
    
    return groups;
  }, [prospects]);

  const handleDragStart = (event: DragStartEvent) => {
    const prospect = event.active.data.current?.prospect as Prospect;
    if (prospect) {
      setActiveProspect(prospect);
      setExpandedProspectId(null); // Collapse any expanded card when dragging
    }
  };

  const handleDragOver = (event: any) => {
    const overId = event.over?.id;
    if (overId && FUNNEL_COLUMNS.includes(overId as any)) {
      setOverColumnId(overId);
    } else {
      setOverColumnId(null);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveProspect(null);
    setOverColumnId(null);

    if (!over) return;

    const prospectId = active.id as string;
    const newStage = over.id as FunnelStage;
    const prospect = active.data.current?.prospect as Prospect;

    if (!prospect || !FUNNEL_COLUMNS.includes(newStage)) return;

    // Don't update if dropped in the same column
    if (prospect.funnel_stage === newStage) return;

    try {
      await updateProspect(prospectId, { funnel_stage: newStage });
      toast.success(`${prospect.name} moved to ${newStage}`);
    } catch (error) {
      toast.error('Failed to update prospect stage');
    }
  };

  const handleAddTodo = async (text?: string) => {
    const todoText = text || newTodoInput.trim();
    if (!todoText) return;
    await addTodo(todoText);
    setNewTodoInput('');
  };

  const handlePreFillTodo = (text: string) => {
    setNewTodoInput(text);
    // Focus the input
    const input = document.querySelector('input[placeholder="Add a to-do task or reminder…"]') as HTMLInputElement;
    if (input) {
      input.focus();
      input.scrollIntoView({ behavior: 'smooth' });
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

  const handleToggleExpand = (prospectId: string) => {
    setExpandedProspectId(prev => prev === prospectId ? null : prospectId);
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
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20 flex flex-col">
      <header className="sticky top-0 z-40 bg-card/80 backdrop-blur-xl border-b border-border/50">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <img 
              src={nevoraLogo} 
              alt="NevorAI Logo" 
              className="h-10 w-10 rounded-xl object-cover shadow-md"
            />
            <div>
              <h1 className="text-lg font-bold tracking-tight">NevorAI</h1>
              <p className="text-[10px] text-muted-foreground font-medium">Never miss a followup Again</p>
            </div>
          </div>
        </div>
      </header>

      <main className={cn("flex-1 container py-4 px-4 space-y-5 pb-40", !isPro && "pb-48")}>
        <div className="mb-2">
          <h2 className="text-2xl font-bold tracking-tight">Todo Up</h2>
          <p className="text-sm text-muted-foreground">Your Tasks & Funnel Overview</p>
          <div className="flex items-center gap-1 mt-2">
            <div className="w-8 h-1 bg-accent rounded-full" />
            <div className="w-2 h-1 bg-accent/50 rounded-full" />
            <div className="w-1 h-1 bg-accent/30 rounded-full" />
          </div>
        </div>

        {/* Lock overlay for Free users */}
        {!isPro && (
          <div className="relative mb-6">
            <div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-background/80 backdrop-blur-sm rounded-2xl py-16">
              <div className="p-4 rounded-full bg-muted mb-4">
                <Lock className="h-12 w-12 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Pro Feature</h3>
              <p className="text-muted-foreground max-w-sm text-center">
                Subscribe for ₹249 to unlock Todo Up and all premium features.
              </p>
            </div>
          </div>
        )}

        {/* Funnel Stage Dashboard - 4 columns with DnD */}
        <div className="bg-card rounded-2xl p-4 border border-border/50 shadow-sm">
          <p className="text-xs text-muted-foreground mb-3 font-medium">
            Funnel Stage Overview 
            {isPro && <span className="text-accent ml-1">(drag to move)</span>}
          </p>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
          >
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {FUNNEL_COLUMNS.map(stage => (
                <FunnelColumn
                  key={stage}
                  stage={stage}
                  prospects={funnelData[stage]}
                  isPro={isPro}
                  expandedProspectId={expandedProspectId}
                  onToggleExpand={handleToggleExpand}
                  onAddTodo={handlePreFillTodo}
                  isOver={overColumnId === stage}
                />
              ))}
            </div>
            
            <DragOverlay>
              {activeProspect && (
                <div className="px-3 py-2 bg-accent text-accent-foreground rounded-lg shadow-xl text-sm font-medium">
                  {activeProspect.name}
                </div>
              )}
            </DragOverlay>
          </DndContext>
        </div>

        {/* To-Do List */}
        <div className="bg-card rounded-2xl p-4 border border-border/50 shadow-sm flex-1">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle className="h-5 w-5 text-accent" />
            <h3 className="font-semibold">My To-Do List</h3>
          </div>

          {!isPro ? (
            <div className="bg-accent/5 rounded-xl py-8">
              <p className="text-sm text-muted-foreground text-center">
                Upgrade to Pro to manage tasks
              </p>
            </div>
          ) : todosLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : todos.length === 0 ? (
            <div className="bg-accent/5 rounded-xl py-8">
              <p className="text-sm text-muted-foreground text-center">
                No tasks yet. Add one below!
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[40vh] overflow-y-auto">
              {todos.map(todo => (
                <div
                  key={todo.id}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-xl transition-all group",
                    todo.completed 
                      ? "bg-muted/20" 
                      : "bg-accent/5 hover:bg-accent/10"
                  )}
                >
                  <Checkbox
                    checked={todo.completed}
                    onCheckedChange={(checked) => toggleTodo(todo.id, !!checked)}
                    className="data-[state=checked]:bg-accent data-[state=checked]:border-accent"
                  />
                  
                  {editingId === todo.id ? (
                    <div className="flex-1 flex items-center gap-2">
                      <Input
                        value={editingTitle}
                        onChange={(e) => setEditingTitle(e.target.value)}
                        className="h-8 text-sm"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveEdit();
                          if (e.key === 'Escape') handleCancelEdit();
                        }}
                      />
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleSaveEdit}>
                        <Check className="h-4 w-4 text-green-500" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleCancelEdit}>
                        <X className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          "text-sm",
                          todo.completed && "line-through text-muted-foreground"
                        )}>
                          {todo.title}
                        </p>
                        {todo.due_date && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Due: {format(parseISO(todo.due_date), 'dd MMM yyyy')}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-foreground"
                          onClick={() => handleStartEdit(todo.id, todo.title)}
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
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
      </main>

      {/* AI-style input bar at bottom */}
      {isPro && (
        <div className="fixed bottom-20 left-0 right-0 z-30 px-4 pb-2 bg-gradient-to-t from-background via-background to-transparent pt-4">
          <div className="max-w-lg mx-auto">
            <div className="flex items-center gap-2 bg-card border border-accent/30 rounded-2xl p-2 shadow-lg">
              <Input
                placeholder="Add a to-do task or reminder…"
                value={newTodoInput}
                onChange={(e) => setNewTodoInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newTodoInput.trim()) {
                    e.preventDefault();
                    handleAddTodo();
                  }
                }}
                className="flex-1 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground/60"
              />
              <Button
                size="icon"
                className="h-9 w-9 rounded-xl shrink-0 bg-accent hover:bg-accent/90"
                onClick={() => handleAddTodo()}
                disabled={!newTodoInput.trim()}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Upgrade Bar for Free Users */}
      <UpgradeBar />

      <BottomNav />
    </div>
  );
}
