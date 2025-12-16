// Dashboard - Calling Page (Personal Data Only)
import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useProspects } from '@/hooks/useProspects';
import { useSheets } from '@/hooks/useSheets';
import { useTrackingFormatContext } from '@/contexts/TrackingFormatContext';
import { BottomNav } from '@/components/layout/BottomNav';
import { ProspectTable } from '@/components/prospects/ProspectTable';
import { PullToRefreshIndicator } from '@/components/PullToRefreshIndicator';
import { BottomViewToggle } from '@/components/ui/BottomViewToggle';
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
  const { prospects, loading, addProspect, updateProspect, deleteProspect, bulkDeleteProspects, restoreProspect, restoreProspects, importProspects, reorderProspects, refetch } = useProspects();
  const { sheets, selectedSheetId, setSelectedSheetId, addSheet, updateSheet, deleteSheet, refetch: refetchSheets } = useSheets();
  const { refreshFormat } = useTrackingFormatContext();
  
  // Main tab state - Calling is default
  const [mainTab, setMainTab] = useState<'leads' | 'funnel'>('leads');
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  
  // Filter tag setup dialog
  const { needsSetup, markSetupDone } = useFilterTagSetup();
  const [showFilterSetup, setShowFilterSetup] = useState(false);

  // Listen for tag updates from Leader Tracking Format
  useEffect(() => {
    const handleTagsUpdated = () => {
      refreshFormat();
    };
    
    window.addEventListener('leaderTrackingFormatUpdated', handleTagsUpdated);
    return () => window.removeEventListener('leaderTrackingFormatUpdated', handleTagsUpdated);
  }, [refreshFormat]);

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
              <h1 className="text-xl font-bold tracking-tight">
                {mainTab === 'leads' ? 'Leads' : 'Funnel'}
              </h1>
              <p className="text-xs text-muted-foreground font-medium">
                Manage your prospects
              </p>
            </div>
          </div>
        </div>
      </header>

      <main ref={containerRef} className="scrollable-content relative" style={{ touchAction: 'pan-x pan-y' }}>
        <PullToRefreshIndicator isRefreshing={isRefreshing} pullDistance={pullDistance} showIndicator={showIndicator} />
        <div className="py-3 px-4 pb-28">
          {/* WhatsApp-style Search Bar */}
          <div className="mb-3">
            <SearchBar 
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search name, phone..."
            />
          </div>
          
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

      {/* Fixed Bottom View Toggle */}
      <BottomViewToggle
        options={toggleOptions}
        value={mainTab}
        onChange={handleTabChange}
      />

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
