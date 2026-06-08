// Dashboard - Calling Page (Personal Data Only)
import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useProspectsQuery } from '@/hooks/useProspectsQuery';
import { useSheets } from '@/hooks/useSheets';
import { useTrackingFormatContext } from '@/contexts/TrackingFormatContext';
import { BottomNav } from '@/components/layout/BottomNav';

import { LeadLimitCounter } from '@/components/subscription/LeadLimitCounter';

import { PeopleView } from '@/components/people/PeopleView';
import { PullToRefreshIndicator } from '@/components/PullToRefreshIndicator';
import { TopTabBar } from '@/components/ui/TopTabBar';
import { FilterTagSetupDialog, useFilterTagSetup } from '@/components/prospects/FilterTagSetupDialog';
import { KPIStrip } from '@/components/prospects/KPIStrip';
import { TrialBanner } from '@/components/subscription/TrialBanner';
import { UpgradeButton } from '@/components/subscription/UpgradeButton';
import { SubscriptionStatusBanner } from '@/components/subscription/SubscriptionStatusBanner';
import { Loader2, Phone, Layers, Flame, GraduationCap } from 'lucide-react';
import { toast } from 'sonner';
import nevoraLogo from '@/assets/nevorai-call-logo.png';
import { useStreak } from '@/hooks/useStreak';
import { useDemoSeed } from '@/hooks/useDemoSeed';
import { DemoLeadsBanner } from '@/components/prospects/DemoLeadsBanner';


// Pull-to-refresh hook - fixed to not interfere with normal scrolling
function usePullToRefresh(onRefresh: () => Promise<void>, threshold = 100) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const startY = useRef(0);
  const startScrollTop = useRef(0);
  const isPulling = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const handleTouchStart = useCallback((e: TouchEvent) => {
    const container = containerRef.current;
    if (!container) return;
    startY.current = e.touches[0].clientY;
    startScrollTop.current = container.scrollTop;
    isPulling.current = false;
  }, []);
  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!startY.current || isRefreshing) return;
    const container = containerRef.current;
    if (!container) return;
    const currentY = e.touches[0].clientY;
    const diff = currentY - startY.current;
    if (startScrollTop.current <= 0 && container.scrollTop <= 0 && diff > 20) {
      isPulling.current = true;
      setPullDistance(Math.min((diff - 20) * 0.4, threshold * 1.2));
    } else {
      isPulling.current = false;
      setPullDistance(0);
    }
  }, [isRefreshing, threshold]);
  const handleTouchEnd = useCallback(async () => {
    if (pullDistance >= threshold && !isRefreshing && isPulling.current) {
      setIsRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
      }
    }
    setPullDistance(0);
    startY.current = 0;
    startScrollTop.current = 0;
    isPulling.current = false;
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
    container.addEventListener('touchend', handleTouchEnd, {
      passive: true
    });
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
    showIndicator: pullDistance > 30 || isRefreshing
  };
}

export default function Dashboard() {
  const navigate = useNavigate();
  const {
    user,
    loading: authLoading
  } = useAuth();

  // Streak
  const { currentStreak, isInGracePeriod, streakEnabled, loading: streakLoading } = useStreak();
  useDemoSeed();

  // Main tab state - Calling is default
  const [mainTab, setMainTab] = useState<'leads' | 'funnel'>('leads');

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');


  const headerRef = useRef<HTMLElement>(null);

  // Sheets
  const {
    sheets,
    selectedSheetId,
    setSelectedSheetId,
    addSheet,
    updateSheet,
    deleteSheet,
    refetch: refetchSheets,
    getOrCreateTodaySheet
  } = useSheets();

  // Get the filter tag for server-side filtering
  const { leadsStageTag } = useTrackingFormatContext();

  // Use paginated query with sheet/search/filterMode for proper cache separation
  // Map 'leads' tab to 'calling' filterMode for backend
  const queryFilterMode = mainTab === 'leads' ? 'calling' : 'funnel';
  
  // Pass filterTag for server-side filtering in filter mode
  const filterTag = mainTab === 'funnel' ? leadsStageTag : null;

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearchQuery(searchQuery.trim());
    }, 300);

    return () => window.clearTimeout(timer);
  }, [searchQuery]);

  // First-time Academy tip toast — show once per user
  useEffect(() => {
    if (!user?.id) return;
    const key = `academy_welcome_tip_${user.id}`;
    try {
      if (localStorage.getItem(key)) return;
      const timer = window.setTimeout(() => {
        toast('🎓 New here? Visit Enarsia Academy', {
          description: 'Free video tutorials to master the CRM in minutes.',
          duration: 8000,
          action: {
            label: 'Open',
            onClick: () => navigate('/academy'),
          },
        });
        localStorage.setItem(key, '1');
      }, 1500);
      return () => window.clearTimeout(timer);
    } catch {}
  }, [user?.id, navigate]);

  
  const {
    prospects,
    loading,
    kpiTotal,
    kpiTagCounts,
    addProspect,
    updateProspect,
    deleteProspect,
    bulkDeleteProspects,
    bulkDeleteBySheet,
    restoreProspect,
    restoreProspects,
    reorderProspects,
    importProspects,
    fetchAllForExport,
    refetch,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
    loadedCount
  } = useProspectsQuery({
    sheetId: selectedSheetId,
    search: debouncedSearchQuery,
    filterMode: queryFilterMode,
    funnelTag: filterTag
  });

  // Filter tag setup dialog
  const {
    needsSetup,
    markSetupDone
  } = useFilterTagSetup();
  const [showFilterSetup, setShowFilterSetup] = useState(false);

  // Ref to track previous sheet for scroll reset
  const prevSheetIdRef = useRef<string | null>(selectedSheetId);
  const prevTabRef = useRef<string>(mainTab);
  const tableScrollKey = useRef(0);

  // Increment scroll key when sheet or tab changes to trigger scroll reset
  useEffect(() => {
    if (prevSheetIdRef.current !== selectedSheetId || prevTabRef.current !== mainTab) {
      tableScrollKey.current += 1;
      prevSheetIdRef.current = selectedSheetId;
      prevTabRef.current = mainTab;
    }
  }, [selectedSheetId, mainTab]);

  // Handle tab change - show setup dialog when switching to Stages for first time
  const handleTabChange = (newTab: string) => {
    if (newTab === 'funnel' && needsSetup) {
      setShowFilterSetup(true);
    }
    setMainTab(newTab as 'leads' | 'funnel');
  };

  // Pull-to-refresh
  const handleRefresh = useCallback(async () => {
    await Promise.all([refetch?.(), refetchSheets?.()]);
  }, [refetch, refetchSheets]);
  const {
    containerRef: pullRef,
    isRefreshing,
    pullDistance,
    showIndicator
  } = usePullToRefresh(handleRefresh);

  // Swipe gestures removed — tab switching is tap-only

  useEffect(() => {
    if (!user && !authLoading) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  // Only show loader on initial auth check, not for prospects (they have their own skeleton)
  if (authLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>;
  }
  if (!user) return null;

  const toggleOptions: [{
    value: string;
    label: string;
    icon: typeof Phone;
  }, {
    value: string;
    label: string;
    icon: typeof Layers;
    'data-onboarding'?: string;
  }] = [{
    value: 'leads',
    label: 'Leads',
    icon: Phone
  }, {
    value: 'funnel',
    label: 'Funnel',
    icon: Layers,
    'data-onboarding': 'funnel-tab'
  }];

  return <div className="app-layout bg-gradient-to-b from-background via-background to-muted/20">
      {/* Compact Header - matching To-Do density */}
      <header ref={headerRef} className="fixed-header z-40 bg-card/80 backdrop-blur-xl border-b border-border/40">
        {/* Row A: Page title - compact & premium */}
        <div className="flex items-center justify-between px-4 py-2.5">
          <div className="flex items-center gap-2.5">
            <img src={nevoraLogo} alt="Enarsia Logo" className="h-9 w-9 rounded-xl object-cover shadow-sm" />
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-lg font-bold tracking-tight">Calling</h1>
                {streakEnabled && (
                  <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-orange-500/10">
                    <Flame className="h-3.5 w-3.5 text-orange-500" />
                    <span className="text-xs font-bold text-orange-600">{currentStreak}</span>
                  </div>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground font-medium">Manage your prospects</p>
            </div>
          </div>
          {/* Academy quick-access (top-right) */}
          <button
            onClick={() => navigate('/academy')}
            aria-label="Open Enarsia Academy"
            className="relative p-2 rounded-xl bg-gradient-to-br from-amber-400 via-orange-500 to-fuchsia-500 shadow-md shadow-amber-500/30 active:scale-95 transition-transform"
          >
            <GraduationCap className="h-4 w-4 text-white drop-shadow" />
            <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-amber-300 ring-2 ring-background animate-pulse" />
          </button>
        </div>

        
        {/* Row B: Segmented control */}
        <div className="px-4 pb-2">
          <TopTabBar options={toggleOptions} value={mainTab} onChange={handleTabChange} />
        </div>
      </header>

      <main ref={pullRef} className="flex-1 flex flex-col min-h-0 overflow-y-auto overflow-x-hidden" style={{
      touchAction: 'pan-x pan-y'
    }}>
        <PullToRefreshIndicator isRefreshing={isRefreshing} pullDistance={pullDistance} showIndicator={showIndicator} />

        {/* KPI Strip - between toggle and action row */}
        <div className="px-4 pt-2">
          <KPIStrip prospects={prospects} isCalling={mainTab === 'leads'} kpiTotal={kpiTotal} kpiTagCounts={kpiTagCounts} />
        </div>
        
        {/* Trial Banner */}
        <div className="px-4 pt-2">
          <SubscriptionStatusBanner className="mb-2" />
          <TrialBanner tabId="dashboard" />
          <UpgradeButton tabId="dashboard" variant="prominent" />
        </div>

        {/* Lead limit counter for free users */}
        <LeadLimitCounter />
        <DemoLeadsBanner />

        {/* Table area - flex-1 to fill remaining space, pb for bottom nav */}
        <div className="flex-1 min-h-0 px-4 pb-48 lg:pb-20 transition-opacity duration-200">
      {mainTab === 'leads' ? (
        <PeopleView
          source="leads"
          key={`leads-${tableScrollKey.current}`}
          prospects={prospects} 
          loading={loading} 
          onAdd={addProspect} 
          onUpdate={updateProspect} 
          onDelete={deleteProspect} 
          onBulkDelete={bulkDeleteProspects} 
          onBulkDeleteBySheet={bulkDeleteBySheet}
          onRestoreProspect={restoreProspect} 
          onRestoreProspects={restoreProspects} 
          onImport={importProspects} 
          onReorderProspects={reorderProspects}
          sheets={sheets} 
          selectedSheetId={selectedSheetId} 
          onSelectSheet={setSelectedSheetId} 
          onAddSheet={addSheet} 
          onUpdateSheet={updateSheet} 
          onDeleteSheet={deleteSheet} 
          getOrCreateTodaySheet={getOrCreateTodaySheet} 
          filterMode="calling" 
          subFilter="all" 
          externalSearch={searchQuery}
          onExternalSearchChange={setSearchQuery}
          hasNextPage={hasNextPage}
          onLoadMore={fetchNextPage}
          isLoadingMore={isFetchingNextPage}
          kpiTotal={kpiTotal}
          kpiTagCounts={kpiTagCounts}
          loadedCount={loadedCount}
          fetchAllForExport={fetchAllForExport}
          stickyHeaderTop={0}
        />
      ) : (
        <PeopleView
          source="filter"
          key={`funnel-${tableScrollKey.current}`}
          prospects={prospects} 
          loading={loading} 
          onAdd={addProspect} 
          onUpdate={updateProspect} 
          onDelete={deleteProspect} 
          onBulkDelete={bulkDeleteProspects} 
          onBulkDeleteBySheet={bulkDeleteBySheet}
          onRestoreProspect={restoreProspect} 
          onRestoreProspects={restoreProspects} 
          onImport={importProspects} 
          onReorderProspects={reorderProspects}
          sheets={sheets} 
          selectedSheetId={selectedSheetId} 
          onSelectSheet={setSelectedSheetId} 
          onAddSheet={addSheet} 
          onUpdateSheet={updateSheet} 
          onDeleteSheet={deleteSheet} 
          filterMode="funnel" 
          subFilter="all" 
          externalSearch={searchQuery}
          onExternalSearchChange={setSearchQuery}
          hasNextPage={hasNextPage}
          onLoadMore={fetchNextPage}
          isLoadingMore={isFetchingNextPage}
          kpiTotal={kpiTotal}
          kpiTagCounts={kpiTagCounts}
          loadedCount={loadedCount}
          fetchAllForExport={fetchAllForExport}
          stickyHeaderTop={0}
        />
      )}
        </div>
      </main>

      <BottomNav />




      {/* Filter Tag Setup Dialog */}
      <FilterTagSetupDialog open={showFilterSetup} onOpenChange={setShowFilterSetup} onComplete={markSetupDone} />
    </div>;
}
