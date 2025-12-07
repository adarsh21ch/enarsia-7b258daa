// Dashboard - Follow-Up List Page
import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useProspects } from '@/hooks/useProspects';
import { useSheets } from '@/hooks/useSheets';
import { BottomNav } from '@/components/layout/BottomNav';
import { ProspectTable } from '@/components/prospects/ProspectTable';
import { PullToRefreshIndicator } from '@/components/PullToRefreshIndicator';
import { BottomViewToggle } from '@/components/ui/BottomViewToggle';
import { Loader2, Phone, GitBranch } from 'lucide-react';
import { cn } from '@/lib/utils';
import nevoraLogo from '@/assets/nevorai-logo.jpeg';
import { CustomOptionsProvider } from '@/contexts/CustomOptionsContext';

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

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { prospects, loading, addProspect, updateProspect, deleteProspect, bulkDeleteProspects, restoreProspect, restoreProspects, importProspects, reorderProspects, refetch } = useProspects();
  const { sheets, selectedSheetId, setSelectedSheetId, addSheet, updateSheet, deleteSheet, refetch: refetchSheets } = useSheets();
  
  const [mainTab, setMainTab] = useState<'calling' | 'funnel'>('calling');

  // Pull-to-refresh
  const handleRefresh = useCallback(async () => {
    await Promise.all([refetch?.(), refetchSheets?.()]);
  }, [refetch, refetchSheets]);
  const { containerRef, isRefreshing, pullDistance, showIndicator } = usePullToRefresh(handleRefresh);
  

  // Calculate Total CC: 2CC counts as 2, Level Up as 1
  const totalCC = prospects.reduce((sum, p) => {
    if (p.funnel_stage === '2CC') return sum + 2;
    if (p.funnel_stage === 'Level Up') return sum + 1;
    return sum;
  }, 0);

  // Calculate funnel counts for summary bar
  const funnelCounts = {
    enrolled: prospects.filter(p => p.enrollment_status === 'Enrolled').length,
    day1: prospects.filter(p => p.funnel_stage === 'Day 1').length,
    day2: prospects.filter(p => p.funnel_stage === 'Day 2').length,
    day3: prospects.filter(p => p.funnel_stage === 'Day 3').length,
    minBill: prospects.filter(p => p.funnel_stage === 'Minimum Bill').length,
    levelUp: prospects.filter(p => p.funnel_stage === 'Level Up').length,
    twoCC: prospects.filter(p => p.funnel_stage === '2CC').length,
  };

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

  const toggleOptions: [{ value: string; label: string; icon: typeof Phone }, { value: string; label: string; icon: typeof GitBranch }] = [
    { value: 'calling', label: 'Calling', icon: Phone },
    { value: 'funnel', label: 'Funnel', icon: GitBranch },
  ];

  return (
    <CustomOptionsProvider>
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
                <h1 className="text-xl font-bold tracking-tight">Follow Up</h1>
                <p className="text-xs text-muted-foreground font-medium">Calling & Funnel Follow-ups</p>
              </div>
            </div>
            <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl px-4 py-2 text-right border border-primary/10">
              <p className="text-[10px] text-muted-foreground font-medium">Total Min Billing</p>
              <p className="text-2xl font-bold text-primary tracking-tight">{totalCC}</p>
            </div>
          </div>
        </header>

        <main ref={containerRef} className="scrollable-content relative">
          <PullToRefreshIndicator isRefreshing={isRefreshing} pullDistance={pullDistance} showIndicator={showIndicator} />
          <div className="container py-3 px-4 pb-28">
            {/* Funnel Summary Bar - Cleaner Format */}
            <div className="text-xs text-muted-foreground bg-muted/30 rounded-lg px-3 py-2 mb-4">
              <div className="flex flex-wrap items-center gap-x-1 gap-y-1">
                <span>Enrolled: <strong className="text-foreground">{funnelCounts.enrolled}</strong></span>
                <span className="text-muted-foreground/50">·</span>
                <span>Day 1: <strong className="text-foreground">{funnelCounts.day1}</strong></span>
                <span className="text-muted-foreground/50">·</span>
                <span>Day 2: <strong className="text-foreground">{funnelCounts.day2}</strong></span>
                <span className="text-muted-foreground/50">·</span>
                <span>Day 3: <strong className="text-foreground">{funnelCounts.day3}</strong></span>
                <span className="text-muted-foreground/50">·</span>
                <span>Min Bill: <strong className="text-foreground">{funnelCounts.minBill}</strong></span>
                <span className="text-muted-foreground/50">·</span>
                <span>Level Up: <strong className="text-foreground">{funnelCounts.levelUp}</strong></span>
                <span className="text-muted-foreground/50">·</span>
                <span>2CC: <strong className="text-foreground">{funnelCounts.twoCC}</strong></span>
              </div>
            </div>

            {/* Content based on active tab */}
            {mainTab === 'calling' ? (
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
              />
            )}
          </div>
        </main>

        {/* Fixed Bottom View Toggle */}
        <BottomViewToggle
          options={toggleOptions}
          value={mainTab}
          onChange={(v) => setMainTab(v as 'calling' | 'funnel')}
        />

        <BottomNav />
      </div>
    </CustomOptionsProvider>
  );
}