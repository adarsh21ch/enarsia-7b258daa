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
import { Loader2, Clock, CalendarIcon, Phone } from 'lucide-react';
import { parseISO, format, isToday, isSameDay } from 'date-fns';
import { cn } from '@/lib/utils';
import nevoraLogo from '@/assets/nevorai-logo.jpeg';

// Consistent Call icon (matches Calling tab style)
const CallIcon = ({
  className
}: {
  className?: string;
}) => <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.362 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.338 1.85.573 2.81.7A2 2 0 0122 16.92z" />
  </svg>;

// Consistent WhatsApp icon (official style)
const WhatsAppIcon = ({
  className
}: {
  className?: string;
}) => <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>;

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
export default function Home() {
  const navigate = useNavigate();
  const {
    user,
    loading: authLoading
  } = useAuth();
  const {
    prospects,
    loading: prospectsLoading,
    refetch
  } = useProspects();
  const {
    todos,
    refetch: refetchTodos
  } = useTodos();
  const [activityDate, setActivityDate] = useState<Date>(new Date());

  // Pull-to-refresh
  const handleRefresh = useCallback(async () => {
    await Promise.all([refetch?.(), refetchTodos?.()]);
  }, [refetch, refetchTodos]);
  const {
    containerRef,
    isRefreshing,
    pullDistance,
    showIndicator
  } = usePullToRefresh(handleRefresh);
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
    return <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>;
  }
  if (!user) return null;

  // Get all activities for the selected date (sorted ascending - earliest at top)
  const getActivitiesForDate = () => {
    const prospectActivities = prospects.filter(p => isSameDay(parseISO(p.updated_at), activityDate)).map(p => ({
      id: p.id,
      type: 'prospect' as const,
      name: p.name,
      phone: p.phone,
      stage: p.funnel_stage,
      action: p.action_taken,
      time: new Date(p.updated_at)
    }));
    const todoActivities = todos.filter(t => isSameDay(parseISO(t.updated_at), activityDate)).map(t => ({
      id: t.id,
      type: 'todo' as const,
      name: t.title,
      phone: null,
      stage: t.completed ? 'Completed' : 'Updated',
      action: null,
      time: new Date(t.updated_at)
    }));

    // Combine and sort ascending (earliest at top, newest at bottom)
    return [...prospectActivities, ...todoActivities].sort((a, b) => a.time.getTime() - b.time.getTime());
  };
  const activities = getActivitiesForDate();
  return <div className="app-layout bg-gradient-to-b from-background via-background to-muted/20">
      <header className="fixed-header z-40 bg-card/80 backdrop-blur-xl border-b border-border/50">
        <div className="flex items-center px-4 py-3">
          <div className="flex items-center gap-3">
            <img src={nevoraLogo} alt="NevorAI Logo" className="h-10 w-10 rounded-xl object-cover shadow-md" />
            <div>
              <h1 className="text-xl font-bold tracking-tight">Activity</h1>
              <p className="text-xs text-muted-foreground font-medium">Track all your activities</p>
            </div>
          </div>
        </div>
      </header>

      <main ref={containerRef} className="scrollable-content relative flex flex-col">
        <PullToRefreshIndicator isRefreshing={isRefreshing} pullDistance={pullDistance} showIndicator={showIndicator} />
        <div className="container py-3 px-3 pb-20 flex-1 flex flex-col">
          {/* Today's Recent Activities - Main Focus */}
          <div className="bg-card rounded-2xl p-3 border border-border/50 flex-1 flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                <div>
                  <h3 className="font-semibold text-sm">Today's Recent Activities</h3>
                  <p className="text-xs text-muted-foreground">All user activities</p>
                </div>
              </div>
              {/* Date picker with pill outline style */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs rounded-full border-border/60 px-3">
                    <CalendarIcon className="h-3.5 w-3.5" />
                    {isToday(activityDate) ? 'Today' : format(activityDate, 'dd MMM')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <Calendar mode="single" selected={activityDate} onSelect={date => date && setActivityDate(date)} initialFocus />
                </PopoverContent>
              </Popover>
            </div>
            
            {activities.length === 0 ? <div className="text-center py-12 flex-1 flex flex-col items-center justify-center">
                <Clock className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">
                  No activity for this date
                </p>
                <p className="text-xs text-muted-foreground/70 mt-1">
                  Activities will appear here
                </p>
              </div> : <div className="flex-1 overflow-y-auto">
              {/* Clean vertical timeline - line connects between times only */}
                <div className="space-y-0">
                  {activities.map((activity, index) => <div key={`${activity.type}-${activity.id}`} className="relative">
                      {/* Connecting line between this time and the next - only show if not last item */}
                      {index < activities.length - 1 && <div className="absolute left-[26px] top-[22px] bottom-0 w-px bg-border/60" />}
                      
                      <div className="relative flex gap-3">
                        {/* Time label - left aligned with dot */}
                        <div className="shrink-0 w-14 gap-1 flex items-center justify-center border-none">
                          <span className="text-[10px] text-muted-foreground/80 font-medium">
                            {format(activity.time, 'h:mm a')}
                          </span>
                          
                        </div>
                        
                        {/* Activity content */}
                        <div className="flex-1 min-w-0 pb-3">
                          {/* Main content card */}
                          <div className="flex items-start justify-between gap-2 p-2.5 rounded-xl bg-muted/30 hover:bg-muted/40 transition-colors">
                            <div className="min-w-0 flex-1">
                              {/* Activity name */}
                              <p className="text-sm font-medium truncate">{activity.name}</p>
                              
                              {/* Tags - placed below the name */}
                              <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
                                {activity.stage && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">
                                    {activity.stage}
                                  </span>}
                                {activity.action && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                                    {activity.action}
                                  </span>}
                                {activity.type === 'todo' && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-600">
                                    To-Do
                                  </span>}
                              </div>
                            </div>
                            
                            {/* Call/WhatsApp buttons */}
                            {activity.phone && <div className="flex items-center gap-1 shrink-0">
                                <button onClick={() => handleCall(activity.phone!)} className="p-1.5 rounded-full transition-colors bg-secondary">
                                  <CallIcon className="h-4 w-4 text-primary" />
                                </button>
                                <button onClick={() => handleWhatsApp(activity.phone!)} className="p-1.5 rounded-full bg-green-500/10 hover:bg-green-500/20 transition-colors">
                                  <WhatsAppIcon className="h-4 w-4 text-green-600" />
                                </button>
                              </div>}
                          </div>
                        </div>
                      </div>
                    </div>)}
                </div>
              </div>}
          </div>
        </div>
      </main>

      <BottomNav className="px-0 my-0 border-0 py-[10px]" />
    </div>;
}