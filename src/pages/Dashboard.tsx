// Dashboard - Calling Page (Personal Data Only)
import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useProspectsQuery } from '@/hooks/useProspectsQuery';
import { useSheets } from '@/hooks/useSheets';
import { useTrackingFormatContext } from '@/contexts/TrackingFormatContext';
import { BottomNav } from '@/components/layout/BottomNav';
import { HeaderBellIcon } from '@/components/layout/HeaderBellIcon';
import { ProspectTable } from '@/components/prospects/ProspectTable';
import { PullToRefreshIndicator } from '@/components/PullToRefreshIndicator';
import { TopTabBar } from '@/components/ui/TopTabBar';
import { FilterTagSetupDialog, useFilterTagSetup } from '@/components/prospects/FilterTagSetupDialog';
import { SearchBar } from '@/components/ui/SearchBar';
import { TrialBanner } from '@/components/subscription/TrialBanner';
import { Loader2, Phone, Layers, Flame } from 'lucide-react';
import nevoraLogo from '@/assets/nevorai-logo.jpeg';
import { useStreak } from '@/hooks/useStreak';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

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
      <header className="fixed-header z-40 bg-card/80 backdrop-blur-xl border-b border-border/50">
        {/* Row A: Page title - compact */}
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <img src={nevoraLogo} alt="NevorAI Logo" className="h-10 w-10 rounded-xl object-cover shadow-md" />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight">Calling</h1>
                {streakEnabled && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-orange-500/10 cursor-default">
                          <Flame className="h-4 w-4 text-orange-500" />
                          <span className="text-sm font-bold text-orange-600">{currentStreak}</span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="max-w-[200px]">
                        {currentStreak > 0
                          ? `You're on a ${currentStreak}-day streak! Keep going by adding leads or making calls daily.`
                          : 'Start your streak by being active today!'}
                        {isInGracePeriod && (
                          <p className="text-amber-500 mt-1 text-xs font-medium">You missed a day! Stay active to keep your streak.</p>
                        )}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
              <p className="text-xs text-muted-foreground font-medium">Manage your prospects</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <HeaderBellIcon />
          </div>
        </div>
        
        {/* Row B: Segmented control - compact like To-Do */}
        <div className="px-4 pb-1.5">
          <TopTabBar options={toggleOptions} value={mainTab} onChange={handleTabChange} />
        </div>
        
        {/* Row C: Search Bar - more compact */}
        <div className="px-4 pb-2">
          <SearchBar value={searchQuery} onChange={setSearchQuery} placeholder="Search name, phone..." className="h-8" />
        </div>
      </header>

      <main ref={pullRef} className="flex-1 flex flex-col min-h-0 overflow-hidden" style={{
      touchAction: 'pan-x pan-y'
    }}>
        <PullToRefreshIndicator isRefreshing={isRefreshing} pullDistance={pullDistance} showIndicator={showIndicator} />
        
        {/* Trial Banner */}
        <div className="px-4 pt-2">
          <TrialBanner tabId="dashboard" />
        </div>
        
        {/* Table area - flex-1 to fill remaining space, pb for bottom nav */}
        <div className="flex-1 min-h-0 px-4 pb-16 md:pb-24 lg:pb-16 overflow-y-auto">
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
              hasNextPage={hasNextPage}
              onLoadMore={fetchNextPage}
              isLoadingMore={isFetchingNextPage}
              kpiTotal={kpiTotal}
              kpiTagCounts={kpiTagCounts}
              loadedCount={loadedCount}
              fetchAllForExport={fetchAllForExport}
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
            />
          )}
        </div>
      </main>

      <BottomNav />

      {/* Filter Tag Setup Dialog */}
      <FilterTagSetupDialog open={showFilterSetup} onOpenChange={setShowFilterSetup} onComplete={markSetupDone} />
    </div>;
}
