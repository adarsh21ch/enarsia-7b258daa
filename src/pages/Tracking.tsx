import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { BottomNav } from '@/components/layout/BottomNav';
import { FunnelTracker } from '@/components/trackup/FunnelTracker';
import { LeadsTracker } from '@/components/trackup/LeadsTracker';
import { UpgradeBar } from '@/components/subscription/UpgradeBar';
import { PullToRefreshIndicator } from '@/components/PullToRefreshIndicator';
import { BottomViewToggle } from '@/components/ui/BottomViewToggle';
import { Day1SetupDialog } from '@/components/trackup/Day1SetupDialog';
import { TeamToggle } from '@/components/team/TeamToggle';
import { Loader2, TrendingUp, Calendar, Lock } from 'lucide-react';
import { useProspects } from '@/hooks/useProspects';
import { useSharedProspects } from '@/hooks/useSharedProspects';
import { useSubscription } from '@/hooks/useSubscription';
import { useProspectLimit } from '@/hooks/useProspectLimit';
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

export default function Tracking() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { prospects, refetch } = useProspects();
  const { 
    sharedOwners, 
    selectedOwnerIds, 
    selectAllOwners,
    clearSelection 
  } = useSharedProspects();
  const { isPro, loading: subLoading } = useSubscription();
  const prospectLimit = useProspectLimit(prospects, isPro);
  const { config, loading: configLoading, saveConfig } = useFunnelConfig();
  const [activeTab, setActiveTab] = useState('leads');
  const [showDay1Setup, setShowDay1Setup] = useState(false);

  // Handle tab change - show Day 1 setup if switching to funnel with no config
  const handleTabChange = (newTab: string) => {
    if (newTab === 'funnel' && !config && !configLoading) {
      setShowDay1Setup(true);
    }
    setActiveTab(newTab);
  };

  // Save Day 1 date from setup dialog
  const handleDay1Save = async (date: Date) => {
    await saveConfig({
      funnel_name: 'Default Funnel',
      funnel_length: 3, // Fixed 3-day funnel
      day_1_start: format(date, 'yyyy-MM-dd'),
    });
    setShowDay1Setup(false);
  };

  // Show lock only if Free AND at/over limit
  const showLock = !isPro && prospectLimit.isAtLimit;

  // Pull-to-refresh
  const handleRefresh = useCallback(async () => {
    await refetch?.();
  }, [refetch]);
  const { containerRef, isRefreshing, pullDistance, showIndicator } = usePullToRefresh(handleRefresh);

  // Calculate Total CC: 2CC counts as 2, Level Up as 1
  const totalCC = prospects.reduce((sum, p) => {
    if (p.funnel_stage === '2CC') return sum + 2;
    if (p.funnel_stage === 'Level Up') return sum + 1;
    return sum;
  }, 0);

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

  const toggleOptions: [{ value: string; label: string; icon: typeof Calendar }, { value: string; label: string; icon: typeof TrendingUp }] = [
    { value: 'leads', label: 'Leads', icon: Calendar },
    { value: 'funnel', label: 'Funnel', icon: TrendingUp },
  ];

  return (
    <div className="app-layout bg-gradient-to-b from-background via-background to-muted/20">
      {/* Premium Header */}
      <header className="fixed-header z-40 bg-card/80 backdrop-blur-xl border-b border-border/50">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <img 
              src={nevoraLogo} 
              alt="NevorAI Logo" 
              className="h-10 w-10 rounded-xl object-cover shadow-md"
            />
            <div>
              <h1 className="text-xl font-bold tracking-tight">Track Up</h1>
              <p className="text-xs text-muted-foreground font-medium">Track Your Numbers</p>
            </div>
          </div>
          <TeamToggle
            sharedOwners={sharedOwners}
            selectedOwnerIds={selectedOwnerIds}
            onSelectAll={selectAllOwners}
            onClear={clearSelection}
            currentTab="track"
          />
        </div>
      </header>

      <main ref={containerRef} className="scrollable-content relative">
        <PullToRefreshIndicator isRefreshing={isRefreshing} pullDistance={pullDistance} showIndicator={showIndicator} />
        <div className={cn("container py-2 px-3 h-full flex flex-col", showLock ? "pb-36" : "pb-24")}>
          {/* Lock overlay only shows when Free AND at/over limit */}
          {showLock && (
            <div className="relative mb-4">
              <div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-background/80 backdrop-blur-sm rounded-xl">
                <div className="p-3 rounded-full bg-muted mb-3">
                  <Lock className="h-10 w-10 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-1">Pro Feature</h3>
                <p className="text-sm text-muted-foreground max-w-sm text-center">
                  You've reached the free limit of {prospectLimit.limit} prospects. Subscribe to Pro Monthly (₹249, non-refundable) or Pro Yearly (₹2,999, 7-day refund window) to unlock TrackUp and all premium features.
                </p>
              </div>
            </div>
          )}

          {/* Content based on active tab - always show real data */}
          <div className="flex-1 min-h-0">
            {activeTab === 'funnel' ? (
              <FunnelTracker isPro={true} />
            ) : (
              <LeadsTracker isPro={true} />
            )}
          </div>
        </div>
      </main>

      {/* Day 1 Setup Dialog */}
      <Day1SetupDialog 
        open={showDay1Setup} 
        onSave={handleDay1Save} 
      />

      {/* Fixed Bottom View Toggle */}
      <BottomViewToggle
        options={toggleOptions}
        value={activeTab}
        onChange={handleTabChange}
      />

      {/* Upgrade Bar only for Free Users at/over limit */}
      {showLock && <UpgradeBar />}

      <BottomNav />
    </div>
  );
}