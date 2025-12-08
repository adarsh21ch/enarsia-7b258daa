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
      <div className="space-y-2">
        <div className="grid grid-cols-2 gap-1.5">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full animate-fade-in">
      {/* KPI Cards - Compact */}
      <div className="grid grid-cols-2 gap-1.5 mb-1.5 flex-shrink-0">
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
                "relative overflow-hidden rounded-lg p-1.5",
                "bg-gradient-to-br backdrop-blur-sm",
                "shadow-sm border border-white/10",
                config.bgGradient
              )}
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <div className="flex items-start justify-between mb-0.5">
                <div className={cn("p-0.5 rounded bg-gradient-to-br shadow-sm", config.gradient)}>
                  <Icon className="h-2.5 w-2.5 text-white" />
                </div>
                <div className="flex items-center gap-0.5 text-[8px] text-muted-foreground">
                  <Target className="h-2 w-2" />
                  <span>{goal}</span>
                </div>
              </div>
              <p className="text-lg font-bold tracking-tight leading-none">{isPro ? value : '–'}</p>
              <p className="text-[8px] text-muted-foreground">{config.label}</p>
              <div className="mt-0.5 h-0.5 w-full overflow-hidden rounded-full bg-black/10">
                <div
                  className={cn("h-full rounded-full transition-all duration-700 bg-gradient-to-r", getProgressColor(value, goal))}
                  style={{ width: isPro ? `${percentage}%` : '0%' }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Daily Leads Tracking Card */}
      <div className="glass-card rounded-xl overflow-hidden flex flex-col flex-1 min-h-0">
        {/* Section Header */}
        <div className="px-2 py-1 border-b border-border/50 flex-shrink-0">
          <div className="flex items-center gap-1.5">
            <Calendar className="h-3 w-3 text-primary" />
            <h3 className="font-semibold text-[11px]">Daily Leads Tracking</h3>
          </div>
        </div>

        {/* Month Selector */}
        <div className="flex items-center justify-center gap-2 py-1 bg-muted/30 flex-shrink-0">
          <Button variant="ghost" size="icon" onClick={() => changeMonth('prev')} className="h-5 w-5 rounded-full">
            <ChevronLeft className="h-3 w-3" />
          </Button>
          <div className="text-center min-w-[120px]">
            <p className="font-semibold text-[11px]">{formattedMonth}</p>
            <p className="text-[9px] text-muted-foreground">
              <span className="text-primary font-medium">{daysInMonth - daysRemaining}</span>/{daysInMonth} days
              {daysRemaining > 0 && <span className="ml-1">• {daysRemaining} left</span>}
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={() => changeMonth('next')} className="h-5 w-5 rounded-full">
            <ChevronRight className="h-3 w-3" />
          </Button>
        </div>

        {/* Table Header - Sticky */}
        <div className="flex-shrink-0 bg-card border-b border-border/30 sticky top-0 z-10">
          <table className="w-full table-fixed">
            <thead>
              <tr>
                <th className="py-0.5 px-1 text-left text-[9px] font-semibold text-muted-foreground w-14">Date</th>
                {METRICS.map(metric => {
                  const config = METRIC_CONFIG[metric];
                  return (
                    <th key={metric} className={cn("py-0.5 px-0.5 text-center text-[9px] font-semibold bg-gradient-to-b", config.bgGradient)}>
                      {TABLE_LABELS[metric]}
                    </th>
                  );
                })}
              </tr>
            </thead>
          </table>
        </div>

        {/* Scrollable Table Body */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0">
          <table className="w-full table-fixed">
            <tbody>
              {dailyMetrics.map((row, idx) => (
                <tr key={row.dayNumber} className={cn("border-b border-border/20", idx % 2 === 0 ? "bg-background" : "bg-muted/20")}>
                  <td className="py-0.5 px-1 text-[9px] font-medium text-muted-foreground w-14 whitespace-nowrap">{row.date}</td>
                  {METRICS.map(metric => (
                    <td key={metric} className="py-0.5 px-0.5">
                      <div className="h-4 flex items-center justify-center text-[10px] font-medium rounded bg-background/50">
                        {isPro ? row[metric] : '–'}
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* TOTAL row - Fixed at bottom of card */}
        <div className="flex-shrink-0 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-t border-border/50">
          <table className="w-full table-fixed">
            <tbody>
              <tr>
                <td className="py-1 px-1 text-[9px] font-bold bg-card w-14">TOTAL</td>
                {METRICS.map(metric => (
                  <td key={metric} className="py-1 px-0.5">
                    <div className="h-4 flex items-center justify-center text-[10px] font-bold rounded bg-background/80 backdrop-blur-sm shadow-sm">
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
  );
}
