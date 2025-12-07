// Home Dashboard Page
import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useProspects } from '@/hooks/useProspects';
import { useUserTargets } from '@/hooks/useUserTargets';

import { BottomNav } from '@/components/layout/BottomNav';
import { StageBadge, StatusBadge } from '@/components/prospects/StatusBadge';
import { PullToRefreshIndicator } from '@/components/PullToRefreshIndicator';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Label } from '@/components/ui/label';
import { 
  Loader2, Users, CheckCircle, TrendingUp, Target,
  Settings2, ChevronDown, Clock, CalendarIcon
} from 'lucide-react';
import { parseISO, format, isToday, isSameDay } from 'date-fns';
import { cn } from '@/lib/utils';
import nevoraLogo from '@/assets/nevorai-logo.jpeg';
import { FUNNEL_STAGES, FunnelStage } from '@/types/prospect';

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
  const { targets, loading: targetsLoading, updateTarget, refetch: refetchTargets } = useUserTargets();
  const [editTargetsOpen, setEditTargetsOpen] = useState(false);
  const [editingTargets, setEditingTargets] = useState<Record<string, number>>({});
  const [targetsExpanded, setTargetsExpanded] = useState(false);
  const [activityDate, setActivityDate] = useState<Date>(new Date());

  // Pull-to-refresh
  const handleRefresh = useCallback(async () => {
    await Promise.all([refetch?.(), refetchTargets?.()]);
  }, [refetch, refetchTargets]);
  const { containerRef, isRefreshing, pullDistance, showIndicator } = usePullToRefresh(handleRefresh);

  useEffect(() => {
    if (!user && !authLoading) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  // Calculate KPIs - 2CC counts as 2 in Total CC
  // Enrollments are counted from action_taken === 'Enrollment' to match Follow Up / Track Up
  const kpis = useMemo(() => {
    const stageCounts: Record<FunnelStage, number> = {
      'Day 1': 0, 'Day 2': 0, 'Day 3': 0,
      'Minimum Bill': 0, 'Level Up': 0, '2CC': 0,
    };
    
    prospects.forEach(p => {
      if (p.funnel_stage && stageCounts[p.funnel_stage] !== undefined) stageCounts[p.funnel_stage]++;
    });

    // Count enrollments from action_taken field (matches Follow Up / Track Up data source)
    const enrolled = prospects.filter(p => p.action_taken === 'Enrollment').length;
    
    // Calculate total CC: 2CC counts as 2, Level Up as 1
    const totalCC = prospects.reduce((sum, p) => {
      if (p.funnel_stage === '2CC') return sum + 2;
      if (p.funnel_stage === 'Level Up') return sum + 1;
      return sum;
    }, 0);
    
    return {
      totalLeads: prospects.length,
      totalEnrolled: enrolled,
      stageCounts,
      totalCC,
    };
  }, [prospects]);

  const cleanPhoneNumber = (phone: string) => phone.replace(/[^0-9+]/g, '');

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
          {/* KPI Cards */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { title: 'Total Leads', value: kpis.totalLeads, icon: Users, gradient: 'from-blue-500/20 to-blue-600/10', iconColor: 'text-blue-500' },
              { title: 'Enrolled', value: kpis.totalEnrolled, icon: CheckCircle, gradient: 'from-green-500/20 to-green-600/10', iconColor: 'text-green-500' },
              { title: 'Day 1', value: kpis.stageCounts['Day 1'], icon: TrendingUp, gradient: 'from-purple-500/20 to-purple-600/10', iconColor: 'text-purple-500' },
              { title: 'Total Min Billing', value: kpis.totalCC, icon: Target, gradient: 'from-amber-500/20 to-amber-600/10', iconColor: 'text-amber-500' },
            ].map((stat) => {
              const Icon = stat.icon;
              return (
                <div
                  key={stat.title}
                  className={cn(
                    "relative overflow-hidden rounded-2xl p-4 bg-gradient-to-br border-0",
                    "backdrop-blur-sm shadow-lg shadow-black/5",
                    stat.gradient
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">{stat.title}</p>
                      <p className="text-3xl font-bold tracking-tight">{stat.value}</p>
                    </div>
                    <div className={cn("p-2.5 rounded-xl bg-background/50 backdrop-blur-sm", stat.iconColor)}>
                      <Icon className="h-5 w-5" />
                    </div>
                  </div>
                  <div className="absolute -right-4 -bottom-4 w-20 h-20 rounded-full bg-white/5" />
                </div>
              );
            })}
          </div>

          {/* Monthly Targets - Enrollment always visible */}
          <div className="bg-card rounded-2xl p-4 border border-border/50">
            {/* Header with Edit button */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">Monthly Targets</h3>
              </div>
              <Dialog open={editTargetsOpen} onOpenChange={setEditTargetsOpen}>
                <DialogTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-8 text-xs"
                    onClick={() => setEditingTargets({ ...targets })}
                  >
                    <Settings2 className="h-3.5 w-3.5 mr-1" />
                    Edit
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Edit Monthly Targets</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
                    {/* Enrollment target first */}
                    <div className="flex items-center justify-between gap-4">
                      <Label className="text-sm font-medium flex-1">Enrollment</Label>
                      <Input
                        type="number"
                        min="0"
                        value={editingTargets['Enrollment'] || 0}
                        onChange={(e) => setEditingTargets(prev => ({
                          ...prev,
                          Enrollment: parseInt(e.target.value) || 0
                        }))}
                        className="w-24 text-right"
                      />
                    </div>
                    {FUNNEL_STAGES.map(stage => (
                      <div key={stage} className="flex items-center justify-between gap-4">
                        <Label className="text-sm font-medium flex-1">{stage}</Label>
                        <Input
                          type="number"
                          min="0"
                          value={editingTargets[stage] || 0}
                          onChange={(e) => setEditingTargets(prev => ({
                            ...prev,
                            [stage]: parseInt(e.target.value) || 0
                          }))}
                          className="w-24 text-right"
                        />
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setEditTargetsOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={async () => {
                      // Save Enrollment target
                      if (editingTargets['Enrollment'] !== targets['Enrollment']) {
                        await updateTarget('Enrollment', editingTargets['Enrollment']);
                      }
                      // Save funnel stage targets
                      for (const stage of FUNNEL_STAGES) {
                        if (editingTargets[stage] !== targets[stage]) {
                          await updateTarget(stage, editingTargets[stage]);
                        }
                      }
                      setEditTargetsOpen(false);
                    }}>
                      Save Targets
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {/* Enrollment Row - Always Visible */}
            <div className="space-y-1.5 pb-3 border-b border-border/50">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-foreground">Enrollment</span>
                <span className="font-semibold">{kpis.totalEnrolled} / {targets['Enrollment'] || 0}</span>
              </div>
              <Progress 
                value={targets['Enrollment'] ? Math.min((kpis.totalEnrolled / targets['Enrollment']) * 100, 100) : 0} 
                className="h-2.5" 
              />
            </div>

            {/* Other Stages - Collapsible */}
            <Collapsible open={targetsExpanded} onOpenChange={setTargetsExpanded}>
              <CollapsibleTrigger className="flex items-center gap-2 w-full py-2 mt-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", targetsExpanded && "rotate-180")} />
                <span>{targetsExpanded ? 'Hide details' : 'More details'}</span>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2">
                <div className="space-y-3">
                  {FUNNEL_STAGES.map(stage => {
                    const current = kpis.stageCounts[stage];
                    const target = targets[stage] || 0;
                    const progress = target > 0 ? Math.min((current / target) * 100, 100) : 0;
                    
                    return (
                      <div key={stage} className="space-y-1.5">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">{stage}</span>
                          <span className="font-medium">{current} / {target}</span>
                        </div>
                        <Progress value={progress} className="h-2" />
                      </div>
                    );
                  })}
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>

          {/* Today's Follow-Ups (Recent Activity) - date-based */}
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
                  <p className="text-sm text-muted-foreground text-center py-6">
                    No activity for this date
                  </p>
                );
              }

              return (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {filteredActivities.map((prospect) => (
                    <div
                      key={prospect.id}
                      className="flex items-center justify-between p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{prospect.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <StageBadge stage={prospect.funnel_stage} />
                          {prospect.prospect_status && <StatusBadge status={prospect.prospect_status} />}
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground shrink-0 ml-2 font-medium">
                        {format(parseISO(prospect.updated_at), 'h:mm a')}
                      </p>
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
