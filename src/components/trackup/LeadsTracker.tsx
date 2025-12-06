import { useDailyLeads, DailyLeadRow } from '@/hooks/useDailyLeads';
import { EditableCell } from './EditableCell';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronLeft, ChevronRight, Users, Phone, Video, UserPlus, Calendar, Target } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, parse } from 'date-fns';

const METRICS = ['leads', 'calls', 'videos', 'enrolls'] as const;

const GOALS = { leads: 100, calls: 50, videos: 30, enrolls: 10 };

const METRIC_CONFIG = {
  leads: { icon: Users, gradient: 'from-blue-500 to-blue-600', bgGradient: 'from-blue-500/20 to-blue-500/5', label: 'Leads' },
  calls: { icon: Phone, gradient: 'from-emerald-500 to-emerald-600', bgGradient: 'from-emerald-500/20 to-emerald-500/5', label: 'Calls' },
  videos: { icon: Video, gradient: 'from-violet-500 to-violet-600', bgGradient: 'from-violet-500/20 to-violet-500/5', label: 'Videos' },
  enrolls: { icon: UserPlus, gradient: 'from-orange-500 to-orange-600', bgGradient: 'from-orange-500/20 to-orange-500/5', label: 'Enrolls' },
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
  const { rows, loading, updateCell, totals, monthYear, changeMonth, daysInMonth, daysRemaining } = useDailyLeads();

  const handleCellChange = (dayNumber: number, field: keyof DailyLeadRow, value: number) => {
    updateCell(dayNumber, field, value);
  };

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
    <div className="space-y-6 animate-fade-in">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3">
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
                "relative overflow-hidden rounded-2xl p-4",
                "bg-gradient-to-br backdrop-blur-sm",
                "shadow-lg shadow-black/5 border border-white/10",
                config.bgGradient
              )}
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <div className="flex items-start justify-between mb-3">
                <div className={cn("p-2 rounded-xl bg-gradient-to-br shadow-lg", config.gradient)}>
                  <Icon className="h-4 w-4 text-white" />
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Target className="h-3 w-3" />
                  <span>{goal}</span>
                </div>
              </div>
              <p className="text-3xl font-bold tracking-tight">{isPro ? value : '–'}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{config.label}</p>
              <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-black/10">
                <div
                  className={cn("h-full rounded-full transition-all duration-700 bg-gradient-to-r", getProgressColor(value, goal))}
                  style={{ width: isPro ? `${percentage}%` : '0%' }}
                />
              </div>
              {/* Decorative circle */}
              <div className="absolute -right-6 -bottom-6 w-24 h-24 rounded-full bg-white/5" />
            </div>
          );
        })}
      </div>

      {/* Daily Leads Table */}
      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-border/50">
          <div className="flex items-center gap-2 mb-1">
            <Calendar className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Daily Leads Metrics</h3>
          </div>
          <p className="text-xs text-muted-foreground">Click any cell to edit. Changes save automatically.</p>
        </div>

        {/* Month Selector */}
        <div className="flex items-center justify-center gap-4 py-4 bg-muted/30">
          <Button variant="ghost" size="icon" onClick={() => changeMonth('prev')} className="h-8 w-8 rounded-full">
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="text-center min-w-[180px]">
            <p className="font-semibold">{formattedMonth}</p>
            <p className="text-xs text-muted-foreground">
              <span className="text-primary font-medium">{daysInMonth - daysRemaining}</span>/{daysInMonth} days
              {daysRemaining > 0 && <span className="ml-1">• {daysRemaining} remaining</span>}
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={() => changeMonth('next')} className="h-8 w-8 rounded-full">
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
          <table className="w-full">
            <thead className="sticky top-0 z-10">
              <tr className="bg-card">
                <th className="py-3 px-3 text-left text-xs font-semibold text-muted-foreground w-20 bg-card">Date</th>
                {METRICS.map(metric => {
                  const config = METRIC_CONFIG[metric];
                  return (
                    <th key={metric} className={cn("py-3 px-2 text-center text-xs font-semibold bg-gradient-to-b", config.bgGradient)}>
                      {config.label}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => (
                <tr key={row.day_number} className={cn("border-b border-border/30", idx % 2 === 0 ? "bg-background" : "bg-muted/20")}>
                  <td className="py-2 px-3 text-sm font-medium text-muted-foreground">Day {row.day_number}</td>
                  {METRICS.map(metric => (
                    <td key={metric} className="py-2 px-2">
                      <EditableCell
                        value={isPro ? row[metric] : null}
                        onChange={(value) => handleCellChange(row.day_number, metric, value)}
                        disabled={!isPro}
                        placeholder="–"
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
            <tfoot className="sticky bottom-0">
              <tr className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent">
                <td className="py-3 px-3 text-sm font-bold bg-card">TOTAL</td>
                {METRICS.map(metric => (
                  <td key={metric} className="py-3 px-2">
                    <div className="h-9 flex items-center justify-center text-base font-bold rounded-lg bg-background/80 backdrop-blur-sm shadow-sm">
                      {isPro ? totals[metric] : '–'}
                    </div>
                  </td>
                ))}
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
