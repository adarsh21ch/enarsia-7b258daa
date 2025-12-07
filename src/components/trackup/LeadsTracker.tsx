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
    <div className="space-y-3 animate-fade-in">
      {/* KPI Cards - Compact at Top */}
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
                "relative overflow-hidden rounded-xl p-2",
                "bg-gradient-to-br backdrop-blur-sm",
                "shadow-md shadow-black/5 border border-white/10",
                config.bgGradient
              )}
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <div className="flex items-start justify-between mb-1">
                <div className={cn("p-1 rounded-lg bg-gradient-to-br shadow-md", config.gradient)}>
                  <Icon className="h-3 w-3 text-white" />
                </div>
                <div className="flex items-center gap-0.5 text-[9px] text-muted-foreground">
                  <Target className="h-2 w-2" />
                  <span>{goal}</span>
                </div>
              </div>
              <p className="text-xl font-bold tracking-tight leading-none">{isPro ? value : '–'}</p>
              <p className="text-[9px] text-muted-foreground mt-0.5">{config.label}</p>
              <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-black/10">
                <div
                  className={cn("h-full rounded-full transition-all duration-700 bg-gradient-to-r", getProgressColor(value, goal))}
                  style={{ width: isPro ? `${percentage}%` : '0%' }}
                />
              </div>
              {/* Decorative circle */}
              <div className="absolute -right-3 -bottom-3 w-12 h-12 rounded-full bg-white/5" />
            </div>
          );
        })}
      </div>

      {/* Daily Leads Tracking - Below KPIs */}
      <div className="glass-card rounded-2xl overflow-hidden pb-20">
        <div className="px-3 py-2 border-b border-border/50">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            <h3 className="font-semibold text-sm">Daily Leads Tracking</h3>
          </div>
        </div>

        {/* Month Selector */}
        <div className="flex items-center justify-center gap-4 py-2 bg-muted/30">
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

        {/* Table - shows ~10 days */}
        <div className="overflow-x-auto max-h-[380px] overflow-y-auto">
          <table className="w-full">
            <thead className="sticky top-0 z-10">
              <tr className="bg-card">
                <th className="py-1.5 px-3 text-left text-xs font-semibold text-muted-foreground w-24 bg-card">Date</th>
                {METRICS.map(metric => {
                  const config = METRIC_CONFIG[metric];
                  return (
                    <th key={metric} className={cn("py-1.5 px-2 text-center text-xs font-semibold bg-gradient-to-b", config.bgGradient)}>
                      {TABLE_LABELS[metric]}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {dailyMetrics.map((row, idx) => (
                <tr key={row.dayNumber} className={cn("border-b border-border/30", idx % 2 === 0 ? "bg-background" : "bg-muted/20")}>
                  <td className="py-1 px-3 text-xs font-medium text-muted-foreground">{row.date}</td>
                  {METRICS.map(metric => (
                    <td key={metric} className="py-1 px-2">
                      <div className="h-6 flex items-center justify-center text-sm font-medium rounded-lg bg-background/50">
                        {isPro ? row[metric] : '–'}
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {/* TOTAL row - sticky at bottom */}
          <div className="sticky bottom-0 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-t border-border/50">
            <table className="w-full">
              <tbody>
                <tr>
                  <td className="py-2 px-3 text-xs font-bold bg-card w-24">TOTAL</td>
                  {METRICS.map(metric => (
                    <td key={metric} className="py-2 px-2">
                      <div className="h-7 flex items-center justify-center text-sm font-bold rounded-lg bg-background/80 backdrop-blur-sm shadow-sm">
                        {isPro ? totals[metric] : '–'}
                      </div>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
