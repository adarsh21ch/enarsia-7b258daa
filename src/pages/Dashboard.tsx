// Dashboard - Calling Page (Personal Data Only)
import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useProspectsQuery } from '@/hooks/useProspectsQuery';
import { useSheets } from '@/hooks/useSheets';
import { useTrackingFormatContext } from '@/contexts/TrackingFormatContext';
import { BottomNav } from '@/components/layout/BottomNav';

import { ProspectTable } from '@/components/prospects/ProspectTable';
import { PullToRefreshIndicator } from '@/components/PullToRefreshIndicator';
import { TopTabBar } from '@/components/ui/TopTabBar';
import { FilterTagSetupDialog, useFilterTagSetup } from '@/components/prospects/FilterTagSetupDialog';
import { KPIStrip } from '@/components/prospects/KPIStrip';
import { TrialBanner } from '@/components/subscription/TrialBanner';
import { UpgradeButton } from '@/components/subscription/UpgradeButton';
import { RecentActivityView } from '@/components/todo/RecentActivityView';
import { Loader2, Phone, Layers, Flame, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import nevoraLogo from '@/assets/nevorai-logo.jpeg';
import { useStreak } from '@/hooks/useStreak';
import { cn } from '@/lib/utils';


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

  // Main tab state - Calling is default
  const [mainTab, setMainTab] = useState<'leads' | 'funnel'>('leads');

  // Search state
  const [searchQuery, setSearchQuery] = useState('');

  // Recent activity toggle
  const [showRecentActivity, setShowRecentActivity] = useState(false);

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

  // Get the funnel tag for server-side filtering
  const { leadsStageTag } = useTrackingFormatContext();

  // Use paginated query with sheet/search/filterMode for proper cache separation
  // Map 'leads' tab to 'calling' filterMode for backend
  const queryFilterMode = mainTab === 'leads' ? 'calling' : 'funnel';
  
  // Pass funnelTag for server-side filtering in funnel mode
  const funnelTag = mainTab === 'funnel' ? leadsStageTag : null;
  
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
    search: searchQuery,
    filterMode: queryFilterMode,
    funnelTag
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
  }] = [{
    value: 'leads',
    label: 'Leads',
    icon: Phone
  }, {
    value: 'funnel',
    label: 'Funnel',
    icon: Layers
  }];

  return <div className="app-layout bg-gradient-to-b from-background via-background to-muted/20">
      {/* Compact Header - matching To-Do density */}
      <header ref={headerRef} className="fixed-header z-40 bg-card/80 backdrop-blur-xl border-b border-border/40">
        {/* Row A: Page title - compact & premium */}
        <div className="flex items-center justify-between px-4 py-2.5">
          <div className="flex items-center gap-2.5">
            <img src={nevoraLogo} alt="NevorAI Logo" className="h-9 w-9 rounded-xl object-cover shadow-sm" />
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-lg font-bold tracking-tight">
                  {showRecentActivity ? 'Activity History' : 'Calling'}
                </h1>
                {streakEnabled && !showRecentActivity && (
                  <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-orange-500/10">
                    <Flame className="h-3.5 w-3.5 text-orange-500" />
                    <span className="text-xs font-bold text-orange-600">{currentStreak}</span>
                  </div>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground font-medium">
                {showRecentActivity ? "Today's Updates" : 'Manage your prospects'}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setShowRecentActivity(!showRecentActivity)} className={cn("h-9 w-9 rounded-full", showRecentActivity ? "bg-accent text-accent-foreground hover:bg-accent/90" : "text-muted-foreground")}>
            <Clock className="h-5 w-5" />
          </Button>
        </div>
        
        {/* Row B: Segmented control */}
        {!showRecentActivity && (
          <div className="px-4 pb-2">
            <TopTabBar options={toggleOptions} value={mainTab} onChange={handleTabChange} />
          </div>
        )}
      </header>

      <main ref={pullRef} className="flex-1 flex flex-col min-h-0 overflow-y-auto overflow-x-hidden" style={{
      touchAction: 'pan-x pan-y'
    }}>
        <PullToRefreshIndicator isRefreshing={isRefreshing} pullDistance={pullDistance} showIndicator={showIndicator} />

        {showRecentActivity ? (
          <div className="px-4 pt-2 pb-40 md:pb-24 lg:pb-16">
            <RecentActivityView />
          </div>
        ) : (
          <>
            {/* KPI Strip - between toggle and action row */}
            <div className="px-4 pt-2">
              <KPIStrip prospects={prospects} isCalling={mainTab === 'leads'} kpiTotal={kpiTotal} kpiTagCounts={kpiTagCounts} />
            </div>
            
            {/* Trial Banner */}
            <div className="px-4 pt-2">
              <TrialBanner tabId="dashboard" />
              <UpgradeButton tabId="dashboard" variant="prominent" />
            </div>
            
            {/* Table area - flex-1 to fill remaining space, pb for bottom nav */}
            <div className="flex-1 min-h-0 px-4 pb-48 md:pb-28 lg:pb-20">
          {mainTab === 'leads' ? (
            <ProspectTable 
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
              onSearchChange={setSearchQuery}
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
            <ProspectTable 
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
          </>
        )}
      </main>

      <BottomNav />

      {/* Filter Tag Setup Dialog */}
      <FilterTagSetupDialog open={showFilterSetup} onOpenChange={setShowFilterSetup} onComplete={markSetupDone} />
    </div>;
}
