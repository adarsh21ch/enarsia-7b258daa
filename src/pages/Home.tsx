// Home Dashboard Page
import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useProspects } from '@/hooks/useProspects';
import { useUserTargets } from '@/hooks/useUserTargets';

import { BottomNav } from '@/components/layout/BottomNav';
import { StageBadge, StatusBadge } from '@/components/prospects/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Label } from '@/components/ui/label';
import { 
  Loader2, Users, CheckCircle, TrendingUp, Target,
  Settings2, ChevronDown, Clock
} from 'lucide-react';
import { parseISO, formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import nevoraLogo from '@/assets/nevorai-logo.jpeg';
import { FUNNEL_STAGES, FunnelStage } from '@/types/prospect';

// Removed Today's Followup section - kept for future use if needed

export default function Home() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { prospects, loading: prospectsLoading } = useProspects();
  const { targets, loading: targetsLoading, updateTarget } = useUserTargets();
  const [editTargetsOpen, setEditTargetsOpen] = useState(false);
  const [editingTargets, setEditingTargets] = useState<Record<string, number>>({});
  const [targetsExpanded, setTargetsExpanded] = useState(false);

  useEffect(() => {
    if (!user && !authLoading) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  // Calculate KPIs - 2CC counts as 2 in Total CC
  const kpis = useMemo(() => {
    const stageCounts: Record<FunnelStage, number> = {
      'Enrollment': 0, 'Day 1': 0, 'Day 2': 0, 'Day 3': 0,
      'Minimum Bill': 0, 'Level Up': 0, '2CC': 0,
    };
    
    prospects.forEach(p => {
      if (p.funnel_stage) stageCounts[p.funnel_stage]++;
    });

    const enrolled = prospects.filter(p => p.enrollment_status === 'Enrolled').length;
    
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
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20 pb-24 main-container">
      <header className="sticky top-0 z-40 bg-card/80 backdrop-blur-xl border-b border-border/50 max-w-full">
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

      <main className="container py-4 px-4 space-y-5">
        <div className="mb-2">
          <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-sm text-muted-foreground">Your daily overview</p>
          <div className="flex items-center gap-1 mt-2">
            <div className="w-8 h-1 bg-primary rounded-full" />
            <div className="w-2 h-1 bg-primary/50 rounded-full" />
            <div className="w-1 h-1 bg-primary/30 rounded-full" />
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { title: 'Total Leads', value: kpis.totalLeads, icon: Users, gradient: 'from-blue-500/20 to-blue-600/10', iconColor: 'text-blue-500' },
            { title: 'Enrolled', value: kpis.totalEnrolled, icon: CheckCircle, gradient: 'from-green-500/20 to-green-600/10', iconColor: 'text-green-500' },
            { title: 'Day 1', value: kpis.stageCounts['Day 1'], icon: TrendingUp, gradient: 'from-purple-500/20 to-purple-600/10', iconColor: 'text-purple-500' },
            { title: 'Total CC', value: kpis.totalCC, icon: Target, gradient: 'from-amber-500/20 to-amber-600/10', iconColor: 'text-amber-500' },
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
              <span className="font-semibold">{kpis.stageCounts['Enrollment']} / {targets['Enrollment'] || 0}</span>
            </div>
            <Progress 
              value={targets['Enrollment'] ? Math.min((kpis.stageCounts['Enrollment'] / targets['Enrollment']) * 100, 100) : 0} 
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
                {FUNNEL_STAGES.filter(stage => stage !== 'Enrollment').map(stage => {
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

        {/* Recent Activity - from prospects */}
        <div className="bg-card rounded-2xl p-4 border border-border/50">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Recent Activity</h3>
          </div>
          {prospects.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No recent activity</p>
          ) : (
            <div className="space-y-2">
              {[...prospects]
                .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
                .slice(0, 8)
                .map((prospect) => (
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
                    <p className="text-xs text-muted-foreground shrink-0 ml-2">
                      {formatDistanceToNow(parseISO(prospect.updated_at), { addSuffix: true })}
                    </p>
                  </div>
                ))}
            </div>
          )}
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
