// Dashboard - Calling Page (Personal Data Only)
import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useGlobalProspects } from '@/contexts/ProspectsContext';
import { useSheets } from '@/hooks/useSheets';
import { BottomNav } from '@/components/layout/BottomNav';
import { HeaderBellIcon } from '@/components/layout/HeaderBellIcon';
import { ProspectTable } from '@/components/prospects/ProspectTable';
import { PullToRefreshIndicator } from '@/components/PullToRefreshIndicator';
import { TopTabBar } from '@/components/ui/TopTabBar';
import { FilterTagSetupDialog, useFilterTagSetup } from '@/components/prospects/FilterTagSetupDialog';
import { SearchBar } from '@/components/ui/SearchBar';
import { Loader2, Phone, Layers } from 'lucide-react';
import nevoraLogo from '@/assets/nevorai-logo.jpeg';


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
      try { await onRefresh(); } finally { setIsRefreshing(false); }
    }
    setPullDistance(0);
    startY.current = 0;
    startScrollTop.current = 0;
    isPulling.current = false;
  }, [pullDistance, threshold, isRefreshing, onRefresh]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    
    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: true });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });
    
    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  return { containerRef, isRefreshing, pullDistance, showIndicator: pullDistance > 30 || isRefreshing };
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { prospects, loading, addProspect, updateProspect, deleteProspect, bulkDeleteProspects, restoreProspect, restoreProspects, importProspects, reorderProspects, refetch, optimisticUpdate } = useGlobalProspects();
  const { sheets, selectedSheetId, setSelectedSheetId, addSheet, updateSheet, deleteSheet, refetch: refetchSheets, getOrCreateTodaySheet } = useSheets();
  
  // Main tab state - Calling is default
  const [mainTab, setMainTab] = useState<'leads' | 'funnel'>('leads');
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  
  // Filter tag setup dialog
  const { needsSetup, markSetupDone } = useFilterTagSetup();
  const [showFilterSetup, setShowFilterSetup] = useState(false);

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
  const { containerRef, isRefreshing, pullDistance, showIndicator } = usePullToRefresh(handleRefresh);

  useEffect(() => {
    if (!user && !authLoading) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  // Only show loader on initial auth check, not for prospects (they have their own skeleton)
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  const toggleOptions: [{ value: string; label: string; icon: typeof Phone }, { value: string; label: string; icon: typeof Layers }] = [
    { value: 'leads', label: 'Leads', icon: Phone },
    { value: 'funnel', label: 'Funnel', icon: Layers },
  ];

  // Calculate header height: logo section (~64px) + tab bar (~44px) = ~108px
  const headerHeight = 108;
  
  return (
    <div className="app-layout bg-gradient-to-b from-background via-background to-muted/20">
      {/* Premium Header */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-card/80 backdrop-blur-xl">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <img 
              src={nevoraLogo} 
              alt="NevorAI Logo" 
              className="h-10 w-10 rounded-xl object-cover shadow-md"
            />
            <div>
              <h1 className="text-xl font-bold tracking-tight">Follow Up</h1>
              <p className="text-xs text-muted-foreground font-medium">
                Manage your prospects
              </p>
            </div>
          </div>
          <HeaderBellIcon />
        </div>
        
        {/* Sticky Top Tab Bar - Leads / Funnel */}
        <TopTabBar
          options={toggleOptions}
          value={mainTab}
          onChange={handleTabChange}
        />
      </header>

      <main 
        ref={containerRef} 
        className="flex flex-col overflow-y-auto" 
        style={{ 
          touchAction: 'pan-x pan-y', 
          paddingTop: `${headerHeight}px`,
          height: '100dvh',
          paddingBottom: '64px' // Space for bottom nav
        }}
      >
        <PullToRefreshIndicator isRefreshing={isRefreshing} pullDistance={pullDistance} showIndicator={showIndicator} />
        
        {/* Search Bar */}
        <div className="flex-shrink-0 px-4 pt-2 pb-2">
          <SearchBar 
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search name, phone..."
          />
        </div>
        
        {/* Table area - flex-1 and min-h-0 to allow proper flex shrinking with overflow */}
        <div className="flex-1 min-h-0 px-4">
          {mainTab === 'leads' ? (
            <ProspectTable
              prospects={prospects}
              loading={loading}
              onAdd={addProspect}
              onUpdate={updateProspect}
              onDelete={deleteProspect}
              onBulkDelete={bulkDeleteProspects}
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
            />
          ) : (
            <ProspectTable
              prospects={prospects}
              loading={loading}
              onAdd={addProspect}
              onUpdate={updateProspect}
              onDelete={deleteProspect}
              onBulkDelete={bulkDeleteProspects}
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
            />
          )}
        </div>
      </main>

      <BottomNav />

      {/* Filter Tag Setup Dialog */}
      <FilterTagSetupDialog
        open={showFilterSetup}
        onOpenChange={setShowFilterSetup}
        onComplete={markSetupDone}
      />
    </div>
  );
}
