import { useLeadsFromProspects } from '@/hooks/useLeadsFromProspects';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronLeft, ChevronRight, Users, MessageSquare, Video, UserPlus, Calendar, Target } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, parse } from 'date-fns';

const METRICS = ['leads', 'responses', 'videoSent', 'enrollments'] as const;

const GOALS = { leads: 100, responses: 50, videoSent: 30, enrollments: 10 };

const METRIC_CONFIG = {
  leads: { icon: Users, gradient: 'from-blue-500 to-blue-600', bgGradient: 'from-blue-500/20 to-blue-500/5', label: 'Total Leads' },
  responses: { icon: MessageSquare, gradient: 'from-emerald-500 to-emerald-600', bgGradient: 'from-emerald-500/20 to-emerald-500/5', label: 'Total Responses' },
  videoSent: { icon: Video, gradient: 'from-violet-500 to-violet-600', bgGradient: 'from-violet-500/20 to-violet-500/5', label: 'Total Video Sent' },
  enrollments: { icon: UserPlus, gradient: 'from-orange-500 to-orange-600', bgGradient: 'from-orange-500/20 to-orange-500/5', label: 'Total Enrollments' },
};

const TABLE_LABELS = {
  leads: 'Leads',
  responses: 'Responses',
  videoSent: 'Video Sent',
  enrollments: 'Enrollments',
};

function getProgressColor(current: number, goal: number) {
  const percentage = (current / goal) * 100;
  if (percentage >= 80) return 'from-green-400 to-green-500';
  if (percentage >= 50) return 'from-amber-400 to-amber-500';
  return 'from-red-400 to-red-500';
}

interface LeadsTrackerProps {
  isPro?: boolean;
}

export function LeadsTracker({ isPro = true }: LeadsTrackerProps) {
  const { dailyMetrics, totals, loading, monthYear, changeMonth, daysInMonth, daysRemaining } = useLeadsFromProspects();

  const formattedMonth = format(parse(monthYear, 'yyyy-MM', new Date()), 'MMMM yyyy');

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
        </div>
        <Skeleton className="h-96 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Daily Leads Table - Moved to Top */}
      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="p-3 border-b border-border/50">
          <div className="flex items-center gap-2 mb-0.5">
            <Calendar className="h-4 w-4 text-primary" />
            <h3 className="font-semibold text-sm">Daily Leads Metrics</h3>
          </div>
          <p className="text-xs text-muted-foreground">Data synced from Follow Up list. 5-minute confirmation applied.</p>
        </div>

        {/* Month Selector */}
        <div className="flex items-center justify-center gap-4 py-3 bg-muted/30">
          <Button variant="ghost" size="icon" onClick={() => changeMonth('prev')} className="h-7 w-7 rounded-full">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="text-center min-w-[160px]">
            <p className="font-semibold text-sm">{formattedMonth}</p>
            <p className="text-xs text-muted-foreground">
              <span className="text-primary font-medium">{daysInMonth - daysRemaining}</span>/{daysInMonth} days
              {daysRemaining > 0 && <span className="ml-1">• {daysRemaining} left</span>}
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={() => changeMonth('next')} className="h-7 w-7 rounded-full">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto max-h-[350px] overflow-y-auto">
          <table className="w-full">
            <thead className="sticky top-0 z-10">
              <tr className="bg-card">
                <th className="py-2 px-3 text-left text-xs font-semibold text-muted-foreground w-24 bg-card">Date</th>
                {METRICS.map(metric => {
                  const config = METRIC_CONFIG[metric];
                  return (
                    <th key={metric} className={cn("py-2 px-2 text-center text-xs font-semibold bg-gradient-to-b", config.bgGradient)}>
                      {TABLE_LABELS[metric]}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {dailyMetrics.map((row, idx) => (
                <tr key={row.dayNumber} className={cn("border-b border-border/30", idx % 2 === 0 ? "bg-background" : "bg-muted/20")}>
                  <td className="py-1.5 px-3 text-xs font-medium text-muted-foreground">{row.date}</td>
                  {METRICS.map(metric => (
                    <td key={metric} className="py-1.5 px-2">
                      <div className="h-7 flex items-center justify-center text-sm font-medium rounded-lg bg-background/50">
                        {isPro ? row[metric] : '–'}
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
            <tfoot className="sticky bottom-0">
              <tr className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent">
                <td className="py-2 px-3 text-xs font-bold bg-card">TOTAL</td>
                {METRICS.map(metric => (
                  <td key={metric} className="py-2 px-2">
                    <div className="h-7 flex items-center justify-center text-sm font-bold rounded-lg bg-background/80 backdrop-blur-sm shadow-sm">
                      {isPro ? totals[metric] : '–'}
                    </div>
                  </td>
                ))}
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* KPI Cards - Compact Style */}
      <div className="grid grid-cols-2 gap-2">
        {METRICS.map((metric, i) => {
          const config = METRIC_CONFIG[metric];
          const Icon = config.icon;
          const value = totals[metric];
          const goal = GOALS[metric];
          const percentage = Math.min((value / goal) * 100, 100);
          
          return (
            <div
              key={metric}
              className={cn(
                "relative overflow-hidden rounded-xl p-3",
                "bg-gradient-to-br backdrop-blur-sm",
                "shadow-md shadow-black/5 border border-white/10",
                config.bgGradient
              )}
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <div className="flex items-start justify-between mb-2">
                <div className={cn("p-1.5 rounded-lg bg-gradient-to-br shadow-md", config.gradient)}>
                  <Icon className="h-3.5 w-3.5 text-white" />
                </div>
                <div className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                  <Target className="h-2.5 w-2.5" />
                  <span>{goal}</span>
                </div>
              </div>
              <p className="text-2xl font-bold tracking-tight">{isPro ? value : '–'}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{config.label}</p>
              <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-black/10">
                <div
                  className={cn("h-full rounded-full transition-all duration-700 bg-gradient-to-r", getProgressColor(value, goal))}
                  style={{ width: isPro ? `${percentage}%` : '0%' }}
                />
              </div>
              {/* Decorative circle */}
              <div className="absolute -right-4 -bottom-4 w-16 h-16 rounded-full bg-white/5" />
            </div>
          );
        })}
      </div>
    </div>
  );
}
