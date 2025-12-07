// Dashboard - Follow-Up List Page
import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useProspects } from '@/hooks/useProspects';
import { useSheets } from '@/hooks/useSheets';
import { BottomNav } from '@/components/layout/BottomNav';
import { ProspectTable } from '@/components/prospects/ProspectTable';
import { PullToRefreshIndicator } from '@/components/PullToRefreshIndicator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  const { prospects, loading, addProspect, updateProspect, deleteProspect, importProspects, reorderProspects, refetch } = useProspects();
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
    // Count "Enrollment" response or "Enrolled" enrollment_status
    enrolled: prospects.filter(p => 
      p.action_taken === 'Enrollment' || 
      p.enrollment_status === 'Enrolled'
    ).length,
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
          <div className="container py-3 px-4 pb-20">
            {/* Funnel Summary Bar - Badge Style */}
            <div className="bg-muted/30 rounded-xl px-3 py-2.5 mb-4">
              <p className="text-[10px] text-muted-foreground/70 font-medium mb-2">Current Follow-Up Numbers</p>
              <div className="flex flex-wrap gap-1.5">
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                  Enrolled <strong className="text-emerald-600 dark:text-emerald-300">{funnelCounts.enrolled}</strong>
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium bg-indigo-500/15 text-indigo-700 dark:text-indigo-400 border border-indigo-500/20">
                  D1 <strong className="text-indigo-600 dark:text-indigo-300">{funnelCounts.day1}</strong>
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium bg-violet-500/15 text-violet-700 dark:text-violet-400 border border-violet-500/20">
                  D2 <strong className="text-violet-600 dark:text-violet-300">{funnelCounts.day2}</strong>
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium bg-purple-500/15 text-purple-700 dark:text-purple-400 border border-purple-500/20">
                  D3 <strong className="text-purple-600 dark:text-purple-300">{funnelCounts.day3}</strong>
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                  MB <strong className="text-amber-600 dark:text-amber-300">{funnelCounts.minBill}</strong>
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium bg-orange-500/15 text-orange-700 dark:text-orange-400 border border-orange-500/20">
                  LU <strong className="text-orange-600 dark:text-orange-300">{funnelCounts.levelUp}</strong>
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/20">
                  2CC <strong className="text-rose-600 dark:text-rose-300">{funnelCounts.twoCC}</strong>
                </span>
              </div>
            </div>

            {/* Premium Segmented Control: Calling / Funnel - STICKY */}
            <Tabs value={mainTab} onValueChange={(v) => setMainTab(v as 'calling' | 'funnel')} className="w-full">
              <div className="sticky top-0 z-20 bg-gradient-to-b from-background via-background to-background/95 pb-2 -mx-4 px-4 pt-1">
                <TabsList className="w-full grid grid-cols-2 h-14 p-1.5 bg-muted/50 rounded-2xl gap-1">
                  <TabsTrigger 
                    value="calling" 
                    className={cn(
                      "rounded-xl flex flex-col items-center justify-center gap-0.5 h-full transition-all duration-300",
                      "data-[state=active]:bg-card data-[state=active]:shadow-lg data-[state=active]:shadow-primary/10",
                      "data-[state=active]:text-primary"
                    )}
                  >
                    <Phone className="h-4 w-4" />
                    <span className="text-[10px] font-semibold">Calling</span>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="funnel" 
                    className={cn(
                      "rounded-xl flex flex-col items-center justify-center gap-0.5 h-full transition-all duration-300",
                      "data-[state=active]:bg-card data-[state=active]:shadow-lg data-[state=active]:shadow-primary/10",
                      "data-[state=active]:text-primary"
                    )}
                  >
                    <GitBranch className="h-4 w-4" />
                    <span className="text-[10px] font-semibold">Funnel</span>
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="calling" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
                <ProspectTable
                  prospects={prospects}
                  loading={loading}
                  onAdd={addProspect}
                  onUpdate={updateProspect}
                  onDelete={deleteProspect}
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
              </TabsContent>

              <TabsContent value="funnel" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
                <ProspectTable
                  prospects={prospects}
                  loading={loading}
                  onAdd={addProspect}
                  onUpdate={updateProspect}
                  onDelete={deleteProspect}
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
              </TabsContent>
            </Tabs>
          </div>
        </main>

        <BottomNav />
      </div>
    </CustomOptionsProvider>
  );
}