// Home Dashboard Page
import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { useTodos } from '@/hooks/useTodos';
import { BottomNav } from '@/components/layout/BottomNav';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Loader2, Users, CheckCircle, Calendar as CalendarIcon,
  Plus, Trash2, Phone, MessageCircle, ChevronRight
} from 'lucide-react';
import { format, parseISO, isToday } from 'date-fns';
import { cn } from '@/lib/utils';
import nevoraLogo from '@/assets/nevorai-logo.jpeg';

export default function Home() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { prospects, prospectsLoading } = useData();
  const { todos, loading: todosLoading, addTodo, toggleTodo, deleteTodo } = useTodos();
  const [newTodoTitle, setNewTodoTitle] = useState('');
  const [newTodoDueDate, setNewTodoDueDate] = useState<Date | undefined>();

  useEffect(() => {
    if (!user && !authLoading) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  // Calculate KPIs
  const kpis = useMemo(() => {
    const todayProspects = prospects.filter(p => isToday(parseISO(p.date_added))).length;
    
    return {
      totalLeads: prospects.length,
      todayAdded: todayProspects,
    };
  }, [prospects]);

  // Recent prospects
  const recentProspects = useMemo(() => {
    return [...prospects]
      .sort((a, b) => new Date(b.date_added).getTime() - new Date(a.date_added).getTime())
      .slice(0, 10);
  }, [prospects]);

  const handleAddTodo = async () => {
    if (!newTodoTitle.trim()) return;
    await addTodo(newTodoTitle.trim(), newTodoDueDate ? format(newTodoDueDate, 'yyyy-MM-dd') : undefined);
    setNewTodoTitle('');
    setNewTodoDueDate(undefined);
  };

  const cleanPhoneNumber = (phone: string) => phone.replace(/[^0-9+]/g, '');

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20 pb-24">
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

      <main className="container py-4 px-4 space-y-5">
        <div className="mb-2">
          <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-sm text-muted-foreground">Your daily overview</p>
          <div className="flex items-center gap-1 mt-2">
            <div className="w-8 h-1 bg-primary rounded-full" />
            <div className="w-2 h-1 bg-primary/50 rounded-full" />
            <div className="w-1 h-1 bg-primary/30 rounded-full" />
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 gap-3">
          {prospectsLoading ? (
            <>
              <Skeleton className="h-24 rounded-2xl" />
              <Skeleton className="h-24 rounded-2xl" />
            </>
          ) : (
            [{
              title: 'Total Leads', value: kpis.totalLeads, icon: Users, gradient: 'from-blue-500/20 to-blue-600/10', iconColor: 'text-blue-500'
            }, {
              title: 'Added Today', value: kpis.todayAdded, icon: CheckCircle, gradient: 'from-green-500/20 to-green-600/10', iconColor: 'text-green-500'
            }].map((stat) => {
              const Icon = stat.icon;
              return (
                <div
                  key={stat.title}
                  className={cn(
                    "relative overflow-hidden rounded-2xl p-4 bg-gradient-to-br border-0",
                    "backdrop-blur-sm shadow-lg shadow-black/5",
                    stat.gradient
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">{stat.title}</p>
                      <p className="text-3xl font-bold tracking-tight">{stat.value}</p>
                    </div>
                    <div className={cn("p-2.5 rounded-xl bg-background/50 backdrop-blur-sm", stat.iconColor)}>
                      <Icon className="h-5 w-5" />
                    </div>
                  </div>
                  <div className="absolute -right-4 -bottom-4 w-20 h-20 rounded-full bg-white/5" />
                </div>
              );
            })
          )}
        </div>

        {/* Recent Prospects */}
        <div className="bg-card rounded-2xl p-4 border border-border/50">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Recent Prospects</h3>
            </div>
            <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full font-medium">
              {recentProspects.length}
            </span>
          </div>
          
          {prospectsLoading ? (
            <div className="space-y-2">
              {[1,2,3].map(i => <Skeleton key={i} className="h-14 rounded-xl" />)}
            </div>
          ) : recentProspects.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No prospects yet
            </p>
          ) : (
            <div className="space-y-2">
              {recentProspects.map(prospect => (
                <div
                  key={prospect.id}
                  className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{prospect.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {prospect.city}{prospect.state ? `, ${prospect.state}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => window.location.href = `tel:${cleanPhoneNumber(prospect.phone)}`}
                    >
                      <Phone className="h-4 w-4 text-accent" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-green-500"
                      onClick={() => window.location.href = `whatsapp://send?phone=${cleanPhoneNumber(prospect.phone)}`}
                    >
                      <MessageCircle className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
              <Button
                variant="ghost"
                className="w-full text-xs text-muted-foreground"
                onClick={() => navigate('/dashboard')}
              >
                View all <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          )}
        </div>

        {/* To-Do / Reminders */}
        <div className="bg-card rounded-2xl p-4 border border-border/50">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">To-Do / Reminders</h3>
          </div>
          
          {/* Add new todo */}
          <div className="flex gap-2 mb-4">
            <Input
              placeholder="Add a task..."
              value={newTodoTitle}
              onChange={(e) => setNewTodoTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddTodo()}
              className="flex-1"
            />
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="icon" className="shrink-0">
                  <CalendarIcon className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-popover border-border z-50" align="end">
                <Calendar
                  mode="single"
                  selected={newTodoDueDate}
                  onSelect={setNewTodoDueDate}
                />
              </PopoverContent>
            </Popover>
            <Button onClick={handleAddTodo} size="icon" className="shrink-0">
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {/* Todo list */}
          {todosLoading ? (
            <div className="space-y-2">
              {[1,2].map(i => <Skeleton key={i} className="h-12 rounded-xl" />)}
            </div>
          ) : todos.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No tasks yet. Add one above!
            </p>
          ) : (
            <div className="space-y-2">
              {todos.map(todo => (
                <div
                  key={todo.id}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-xl transition-colors",
                    todo.completed ? "bg-muted/20" : "bg-muted/30"
                  )}
                >
                  <Checkbox
                    checked={todo.completed}
                    onCheckedChange={(checked) => toggleTodo(todo.id, !!checked)}
                  />
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      "text-sm",
                      todo.completed && "line-through text-muted-foreground"
                    )}>
                      {todo.title}
                    </p>
                    {todo.due_date && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Due: {format(parseISO(todo.due_date), 'MMM d')}
                      </p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
                    onClick={() => deleteTodo(todo.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
