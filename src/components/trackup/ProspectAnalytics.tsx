import { Prospect, FUNNEL_STAGES, FunnelStage, STATUSES, ProspectStatus } from '@/types/prospect';
import { StageBadge, StatusBadge } from '@/components/prospects/StatusBadge';
import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Users, UserCheck, AlertTriangle, TrendingUp, Activity } from 'lucide-react';

interface ProspectAnalyticsProps {
  prospects: Prospect[];
  isPro?: boolean;
}

export function ProspectAnalytics({ prospects, isPro = true }: ProspectAnalyticsProps) {
  const stats = useMemo(() => {
    const totalProspects = prospects.length;
    const positiveCount = prospects.filter(p => p.prospect_status === 'Good').length;
    const highPriorityCount = prospects.filter(p => p.priority === 'High').length;
    const levelUpCount = prospects.filter(p => p.funnel_stage === 'Level Up').length;
    return { totalProspects, positiveCount, highPriorityCount, levelUpCount };
  }, [prospects]);

  const stageCounts = useMemo(() => {
    const counts: Record<FunnelStage, number> = {
      'Day 1': 0, 'Day 2': 0, 'Day 3': 0, 'Minimum Bill': 0, 'Level Up': 0, '2CC': 0,
    };
    prospects.forEach((p) => { if (p.funnel_stage && counts[p.funnel_stage] !== undefined) counts[p.funnel_stage]++; });
    return counts;
  }, [prospects]);

  const statusCounts = useMemo(() => {
    const counts: Record<ProspectStatus | 'None', number> = {
      'Good': 0, 'Medium': 0, 'Bad': 0, 'None': 0,
    };
    prospects.forEach((p) => {
      if (p.prospect_status && counts[p.prospect_status] !== undefined) counts[p.prospect_status]++;
      else counts['None']++;
    });
    return counts;
  }, [prospects]);


  const maxStageCount = Math.max(...Object.values(stageCounts), 1);
  const total = prospects.length || 1;

  const statCards = [
    { title: 'Total Prospects', value: isPro ? stats.totalProspects : '–', icon: Users, gradient: 'from-blue-500/20 to-blue-600/10', iconColor: 'text-blue-500' },
    { title: 'Good Prospects', value: isPro ? stats.positiveCount : '–', icon: UserCheck, gradient: 'from-green-500/20 to-green-600/10', iconColor: 'text-green-500' },
    { title: 'High Priority', value: isPro ? stats.highPriorityCount : '–', icon: AlertTriangle, gradient: 'from-red-500/20 to-red-600/10', iconColor: 'text-red-500' },
    { title: 'Level Up', value: isPro ? stats.levelUpCount : '–', icon: TrendingUp, gradient: 'from-purple-500/20 to-purple-600/10', iconColor: 'text-purple-500' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        {statCards.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.title}
              className={cn(
                "relative overflow-hidden rounded-2xl p-4 bg-gradient-to-br border-0",
                "backdrop-blur-sm shadow-lg shadow-black/5",
                stat.gradient
              )}
              style={{ animationDelay: `${i * 50}ms` }}
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

      {/* Stage Distribution */}
      <div className="glass-card rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Funnel Stage Distribution</h3>
        </div>
        <div className="space-y-3">
          {FUNNEL_STAGES.map((stage, i) => {
            const count = isPro ? stageCounts[stage] : 0;
            const percentage = isPro ? (count / maxStageCount) * 100 : 0;
            return (
              <div key={stage} className="space-y-1.5" style={{ animationDelay: `${i * 30}ms` }}>
                <div className="flex items-center justify-between">
                  <StageBadge stage={stage} />
                  <span className="text-sm font-semibold">{isPro ? count : '–'}</span>
                </div>
                <div className="h-2.5 bg-muted/50 rounded-full overflow-hidden">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all duration-700 ease-out',
                      stage === 'Day 1' && 'bg-gradient-to-r from-violet-400 to-violet-500',
                      stage === 'Day 2' && 'bg-gradient-to-r from-pink-400 to-pink-500',
                      stage === 'Day 3' && 'bg-gradient-to-r from-amber-400 to-amber-500',
                      stage === 'Minimum Bill' && 'bg-gradient-to-r from-emerald-400 to-emerald-500',
                      stage === 'Level Up' && 'bg-gradient-to-r from-teal-400 to-teal-500',
                      stage === '2CC' && 'bg-gradient-to-r from-yellow-400 to-yellow-500',
                    )}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Status Distribution */}
      <div className="glass-card rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <UserCheck className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Status Distribution</h3>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {STATUSES.map((status) => {
            const count = isPro ? statusCounts[status] : 0;
            const percentage = isPro ? (count / total) * 100 : 0;
            return (
              <div
                key={status}
                className={cn(
                  "p-3 rounded-xl border border-border/50",
                  "bg-gradient-to-br from-background to-muted/30"
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <StatusBadge status={status} />
                  <span className="text-lg font-bold">{isPro ? count : '–'}</span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-500",
                      status === 'Good' && 'bg-green-500',
                      status === 'Bad' && 'bg-red-500',
                      status === 'Medium' && 'bg-amber-500',
                    )}
                    style={{ width: isPro ? `${percentage}%` : '0%' }}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">{isPro ? `${percentage.toFixed(0)}%` : '–'} of total</p>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
