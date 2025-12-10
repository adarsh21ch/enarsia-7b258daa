// Activity Page - Today's Recent Activities
import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useProspects } from '@/hooks/useProspects';
import { useTodos } from '@/hooks/useTodos';
import { BottomNav } from '@/components/layout/BottomNav';
import { PullToRefreshIndicator } from '@/components/PullToRefreshIndicator';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CallButton, WhatsAppButton } from '@/components/ui/ActionIcons';
import { Loader2, Clock, CalendarIcon } from 'lucide-react';
import { parseISO, format, isToday, isSameDay } from 'date-fns';
import { cn } from '@/lib/utils';
import nevoraLogo from '@/assets/nevorai-logo.jpeg';

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

export default function Home() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { prospects, loading: prospectsLoading, refetch } = useProspects();
  const { todos, refetch: refetchTodos } = useTodos();
  const [activityDate, setActivityDate] = useState<Date>(new Date());

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

  const cleanPhoneNumber = (phone: string) => phone.replace(/[^0-9+]/g, '');

  const handleWhatsApp = (phone: string) => {
    window.location.href = `whatsapp://send?phone=${cleanPhoneNumber(phone)}`;
  };

  const handleCall = (phone: string) => {
    window.location.href = `tel:${cleanPhoneNumber(phone)}`;
  };

  if (authLoading || prospectsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  // Get all activities for the selected date (sorted ascending - earliest at top)
  const getActivitiesForDate = () => {
    const prospectActivities = prospects
      .filter(p => isSameDay(parseISO(p.updated_at), activityDate))
      .map(p => ({
        id: p.id,
        type: 'prospect' as const,
        name: p.name,
        phone: p.phone,
        stage: p.funnel_stage,
        action: p.action_taken,
        time: new Date(p.updated_at),
      }));

    const todoActivities = todos
      .filter(t => isSameDay(parseISO(t.updated_at), activityDate))
      .map(t => ({
        id: t.id,
        type: 'todo' as const,
        name: t.title,
        phone: null,
        stage: t.completed ? 'Completed' : 'Updated',
        action: null,
        time: new Date(t.updated_at),
      }));

    // Combine and sort ascending (earliest at top, newest at bottom)
    return [...prospectActivities, ...todoActivities]
      .sort((a, b) => a.time.getTime() - b.time.getTime());
  };

  const activities = getActivitiesForDate();

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
              <h1 className="text-xl font-bold tracking-tight">Activity</h1>
              <p className="text-xs text-muted-foreground font-medium">Track all your activities</p>
            </div>
          </div>
        </div>
      </header>

      <main ref={containerRef} className="scrollable-content relative flex flex-col">
        <PullToRefreshIndicator isRefreshing={isRefreshing} pullDistance={pullDistance} showIndicator={showIndicator} />
        <div className="container py-3 px-4 pb-20 flex-1 flex flex-col">
          {/* Today's Recent Activities - Main Focus */}
          <div className="bg-card rounded-2xl p-4 border border-border/50 flex-1 flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                <div>
                  <h3 className="font-semibold">Today's Recent Activities</h3>
                  <p className="text-xs text-muted-foreground">All user activities</p>
                </div>
              </div>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
                    <CalendarIcon className="h-3.5 w-3.5" />
                    {isToday(activityDate) ? 'Today' : format(activityDate, 'dd MMM')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <Calendar
                    mode="single"
                    selected={activityDate}
                    onSelect={(date) => date && setActivityDate(date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            
            {activities.length === 0 ? (
              <div className="text-center py-12 flex-1 flex flex-col items-center justify-center">
                <Clock className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">
                  No activity for this date
                </p>
                <p className="text-xs text-muted-foreground/70 mt-1">
                  Activities will appear here
                </p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto relative">
                {/* Timeline vertical line */}
                <div className="absolute left-[52px] top-0 bottom-0 w-0.5 bg-border/50" />
                
                <div className="space-y-0">
                  {activities.map((activity, index) => (
                    <div
                      key={`${activity.type}-${activity.id}`}
                      className="flex items-start gap-3 py-3 pl-2 pr-3"
                    >
                      {/* Time on the left */}
                      <div className="w-12 text-xs text-muted-foreground font-medium text-right shrink-0 pt-0.5">
                        {format(activity.time, 'h:mm a')}
                      </div>
                      
                      {/* Timeline dot */}
                      <div className="relative flex items-center justify-center shrink-0">
                        <div className={cn(
                          "w-3 h-3 rounded-full border-2 z-10",
                          activity.type === 'todo' 
                            ? "bg-blue-500 border-blue-400" 
                            : "bg-primary border-primary/80"
                        )} />
                      </div>
                      
                      {/* Activity card */}
                      <div className="flex-1 flex items-center justify-between p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors min-w-0">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{activity.name}</p>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            {activity.stage && (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                                {activity.stage}
                              </span>
                            )}
                            {activity.action && (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                                {activity.action}
                              </span>
                            )}
                            {activity.type === 'todo' && (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600">
                                To-Do
                              </span>
                            )}
                          </div>
                        </div>
                        {activity.phone && (
                          <div className="flex items-center gap-2 ml-2 shrink-0">
                            <CallButton onClick={() => handleCall(activity.phone!)} size="sm" />
                            <WhatsAppButton onClick={() => handleWhatsApp(activity.phone!)} size="sm" />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
