import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { BottomNav } from '@/components/layout/BottomNav';
import { DynamicFunnelTracker } from '@/components/tracking/DynamicFunnelTracker';
import { DynamicLeadsTracker } from '@/components/tracking/DynamicLeadsTracker';
import { PersonalTrackingForm } from '@/components/tracking/PersonalTrackingForm';
import { TotalTrackingForm } from '@/components/tracking/TotalTrackingForm';
import { UpgradeBar } from '@/components/subscription/UpgradeBar';
import { PullToRefreshIndicator } from '@/components/PullToRefreshIndicator';
import { TopTabBar } from '@/components/ui/TopTabBar';
import { Day1SetupDialog } from '@/components/trackup/Day1SetupDialog';
import { Loader2, TrendingUp, Calendar, User, Users, ArrowLeft } from 'lucide-react';
import { useSubscription } from '@/hooks/useSubscription';
import { useFunnelConfig } from '@/hooks/useFunnelConfig';
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

type MainTab = 'personal' | 'total';

export default function Tracking() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isPro, loading: subLoading } = useSubscription();
  const { config, loading: configLoading, saveConfig, getEffectiveConfig, isReadOnly: isFunnelReadOnly, leaderName: funnelLeaderName } = useFunnelConfig();
  const effectiveConfig = getEffectiveConfig();
  
  // Main tabs: Personal vs Total
  const [mainTab, setMainTab] = useState<MainTab>('personal');
  const [showDay1Setup, setShowDay1Setup] = useState(false);

  // Save Day 1 date from setup dialog
  const handleDay1Save = async (date: Date) => {
    await saveConfig({
      funnel_name: 'Default Funnel',
      funnel_length: 3,
      day_1_start: format(date, 'yyyy-MM-dd'),
    });
    setShowDay1Setup(false);
  };

  // Pro gate disabled for now
  const showProGate = false;

  // Pull-to-refresh
  const handleRefresh = useCallback(async () => {
    // Components handle their own refetch
  }, []);
  const { containerRef, isRefreshing, pullDistance, showIndicator } = usePullToRefresh(handleRefresh);

  useEffect(() => {
    if (!user && !authLoading) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  if (authLoading || subLoading || configLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  const mainTabOptions: [{ value: string; label: string; icon: typeof User }, { value: string; label: string; icon: typeof Users }] = [
    { value: 'personal', label: 'Personal', icon: User },
    { value: 'total', label: 'Total', icon: Users },
  ];

  return (
    <div className="app-layout bg-gradient-to-b from-background via-background to-muted/20">
      {/* Header */}
      <header className="fixed-header z-40 bg-card/80 backdrop-blur-xl border-b border-border/50">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                if (window.history.length > 1) {
                  navigate(-1);
                } else {
                  navigate('/profile');
                }
              }}
              className="p-2 -ml-2 rounded-lg hover:bg-muted/50 transition-colors"
              aria-label="Go back"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <img 
              src={nevoraLogo} 
              alt="NevorAI Logo" 
              className="h-10 w-10 rounded-xl object-cover shadow-md"
            />
            <div>
              <h1 className="text-xl font-bold tracking-tight">Track Up</h1>
              <p className="text-xs text-muted-foreground font-medium">
                {mainTab === 'personal' ? 'Your Personal Numbers' : 'Team Total Numbers'}
              </p>
            </div>
          </div>
        </div>
        
        {/* Personal / Total Switch */}
        <div className="px-4 pb-2">
          <TopTabBar 
            options={mainTabOptions} 
            value={mainTab} 
            onChange={(v) => setMainTab(v as MainTab)} 
          />
        </div>
      </header>

      <main ref={containerRef} className="scrollable-content relative">
        <PullToRefreshIndicator isRefreshing={isRefreshing} pullDistance={pullDistance} showIndicator={showIndicator} />
        <div className={cn("container py-2 px-3 h-full flex flex-col", showProGate ? "pb-36" : "pb-24")}>
          {/* Content based on main tab */}
          <div className="flex-1 min-h-0">
            {mainTab === 'personal' ? (
              <PersonalTrackingForm />
            ) : (
              <TotalTrackingForm />
            )}
          </div>
        </div>
      </main>

      {/* Day 1 Setup Dialog */}
      <Day1SetupDialog 
        open={showDay1Setup} 
        onSave={handleDay1Save} 
      />

      {/* Upgrade Bar only for Free Users */}
      {showProGate && <UpgradeBar />}

      <BottomNav />
    </div>
  );
}
