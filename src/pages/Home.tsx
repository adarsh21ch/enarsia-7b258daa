// Home Dashboard Page - Simplified for Follow-ups
import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useProspects } from '@/hooks/useProspects';
import { BottomNav } from '@/components/layout/BottomNav';
import { PullToRefreshIndicator } from '@/components/PullToRefreshIndicator';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Loader2, Clock, CalendarIcon, Phone, MessageCircle } from 'lucide-react';
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
  const [activityDate, setActivityDate] = useState<Date>(new Date());

  // Pull-to-refresh
  const handleRefresh = useCallback(async () => {
    await refetch?.();
  }, [refetch]);
  const { containerRef, isRefreshing, pullDistance, showIndicator } = usePullToRefresh(handleRefresh);

  useEffect(() => {
    if (!user && !authLoading) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  const cleanPhoneNumber = (phone: string) => phone.replace(/[^0-9+]/g, '');

  const handleWhatsApp = (phone: string) => {
    const cleanPhone = cleanPhoneNumber(phone);
    window.location.href = `whatsapp://send?phone=${cleanPhone}`;
  };

  const handleCall = (phone: string) => {
    window.location.href = `tel:${phone}`;
  };

  if (authLoading || prospectsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
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
              <h1 className="text-xl font-bold tracking-tight">NevorAI</h1>
              <p className="text-xs text-muted-foreground font-medium">Never miss a follow-up again</p>
            </div>
          </div>
        </div>
      </header>

      <main ref={containerRef} className="scrollable-content relative">
        <PullToRefreshIndicator isRefreshing={isRefreshing} pullDistance={pullDistance} showIndicator={showIndicator} />
        <div className="container py-3 px-4 space-y-4 pb-20">
          {/* Today's Follow-Ups - Main Focus */}
          <div className="bg-card rounded-2xl p-4 border border-border/50">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                <div>
                  <h3 className="font-semibold">Today's Follow-Ups</h3>
                  <p className="text-xs text-muted-foreground">Recent Activity</p>
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
            {(() => {
              // Filter prospects by selected date
              const filteredActivities = prospects
                .filter(p => isSameDay(parseISO(p.updated_at), activityDate))
                .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

              if (filteredActivities.length === 0) {
                return (
                  <div className="text-center py-12">
                    <Clock className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                    <p className="text-sm text-muted-foreground">
                      No activity for this date
                    </p>
                    <p className="text-xs text-muted-foreground/70 mt-1">
                      Follow-ups will appear here
                    </p>
                  </div>
                );
              }

              return (
                <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                  {filteredActivities.map((prospect) => (
                    <div
                      key={prospect.id}
                      className="flex items-center justify-between p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{prospect.name}</p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          {prospect.funnel_stage && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                              {prospect.funnel_stage}
                            </span>
                          )}
                          {prospect.action_taken && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                              {prospect.action_taken}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-2">
                        <button
                          onClick={() => handleCall(prospect.phone)}
                          className="p-2 rounded-lg bg-gray-900 text-white hover:bg-gray-800 transition-colors"
                          aria-label="Call"
                        >
                          <Phone className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleWhatsApp(prospect.phone)}
                          className="p-2 rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors"
                          aria-label="WhatsApp"
                        >
                          <MessageCircle className="h-4 w-4" />
                        </button>
                        <p className="text-xs text-muted-foreground shrink-0 font-medium min-w-[50px] text-right">
                          {format(parseISO(prospect.updated_at), 'h:mm a')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
