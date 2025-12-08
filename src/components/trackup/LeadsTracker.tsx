import { useLeadsFromProspects } from '@/hooks/useLeadsFromProspects';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronLeft, ChevronRight, Users, MessageSquare, Video, UserPlus, Calendar, Target } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, parse } from 'date-fns';
import { useRef, useEffect, useState } from 'react';

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
  const [isHeaderSticky, setIsHeaderSticky] = useState(false);
  const tableHeaderRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const formattedMonth = format(parse(monthYear, 'yyyy-MM', new Date()), 'MMMM yyyy');

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const trigger = tableHeaderRef.current;
      if (trigger) {
        const rect = trigger.getBoundingClientRect();
        // Sticky when table header reaches near top (accounting for header ~48px)
        setIsHeaderSticky(rect.top <= 48);
      }
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

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
      {/* Sticky Table Header - Only visible when scrolled past original position */}
      {isHeaderSticky && (
        <div className="fixed top-12 left-0 right-0 z-30 bg-card shadow-md border-b border-border/30">
          <table className="w-full table-fixed">
            <thead>
              <tr>
                <th className="py-1 px-2 text-left text-[10px] font-semibold text-muted-foreground w-16">Date</th>
                {METRICS.map(metric => {
                  const config = METRIC_CONFIG[metric];
                  return (
                    <th key={metric} className={cn("py-1 px-1 text-center text-[10px] font-semibold bg-gradient-to-b", config.bgGradient)}>
                      {TABLE_LABELS[metric]}
                    </th>
                  );
                })}
              </tr>
            </thead>
          </table>
        </div>
      )}

      {/* Scrollable Content Area */}
      <div 
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto overflow-x-hidden pb-4"
        style={{ paddingTop: isHeaderSticky ? '36px' : '0' }}
      >
        {/* KPI Cards - Scroll with content */}
        <div className="grid grid-cols-2 gap-1.5 mb-2">
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
                  "relative overflow-hidden rounded-lg p-2",
                  "bg-gradient-to-br backdrop-blur-sm",
                  "shadow-sm border border-white/10",
                  config.bgGradient
                )}
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <div className="flex items-start justify-between mb-0.5">
                  <div className={cn("p-1 rounded bg-gradient-to-br shadow-sm", config.gradient)}>
                    <Icon className="h-3 w-3 text-white" />
                  </div>
                  <div className="flex items-center gap-0.5 text-[9px] text-muted-foreground">
                    <Target className="h-2.5 w-2.5" />
                    <span>{goal}</span>
                  </div>
                </div>
                <p className="text-xl font-bold tracking-tight leading-none">{isPro ? value : '–'}</p>
                <p className="text-[9px] text-muted-foreground mt-0.5">{config.label}</p>
                <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-black/10">
                  <div
                    className={cn("h-full rounded-full transition-all duration-700 bg-gradient-to-r", getProgressColor(value, goal))}
                    style={{ width: isPro ? `${percentage}%` : '0%' }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Daily Leads Tracking Section Header */}
        <div className="glass-card rounded-xl overflow-hidden mb-2">
          <div className="px-3 py-1.5 border-b border-border/50">
            <div className="flex items-center gap-2">
              <Calendar className="h-3.5 w-3.5 text-primary" />
              <h3 className="font-semibold text-xs">Daily Leads Tracking</h3>
            </div>
          </div>

          {/* Month Selector */}
          <div className="flex items-center justify-center gap-3 py-1.5 bg-muted/30">
            <Button variant="ghost" size="icon" onClick={() => changeMonth('prev')} className="h-6 w-6 rounded-full">
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <div className="text-center min-w-[130px]">
              <p className="font-semibold text-xs">{formattedMonth}</p>
              <p className="text-[10px] text-muted-foreground">
                <span className="text-primary font-medium">{daysInMonth - daysRemaining}</span>/{daysInMonth} days
                {daysRemaining > 0 && <span className="ml-1">• {daysRemaining} left</span>}
              </p>
            </div>
            <Button variant="ghost" size="icon" onClick={() => changeMonth('next')} className="h-6 w-6 rounded-full">
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Table Header - This is the trigger point for sticky */}
          <div ref={tableHeaderRef} className="bg-card border-b border-border/30">
            <table className="w-full table-fixed">
              <thead>
                <tr>
                  <th className="py-1 px-2 text-left text-[10px] font-semibold text-muted-foreground w-16">Date</th>
                  {METRICS.map(metric => {
                    const config = METRIC_CONFIG[metric];
                    return (
                      <th key={metric} className={cn("py-1 px-1 text-center text-[10px] font-semibold bg-gradient-to-b", config.bgGradient)}>
                        {TABLE_LABELS[metric]}
                      </th>
                    );
                  })}
                </tr>
              </thead>
            </table>
          </div>

          {/* Date Rows */}
          <div className="bg-background">
            <table className="w-full table-fixed">
              <tbody>
                {dailyMetrics.map((row, idx) => (
                  <tr key={row.dayNumber} className={cn("border-b border-border/20", idx % 2 === 0 ? "bg-background" : "bg-muted/20")}>
                    <td className="py-1 px-2 text-[10px] font-medium text-muted-foreground w-16 whitespace-nowrap">{row.date}</td>
                    {METRICS.map(metric => (
                      <td key={metric} className="py-0.5 px-1">
                        <div className="h-5 flex items-center justify-center text-[11px] font-medium rounded bg-background/50">
                          {isPro ? row[metric] : '–'}
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* TOTAL Row - Separate, clearly visible */}
        <div className="bg-gradient-to-r from-primary/15 via-primary/10 to-primary/5 rounded-xl shadow-md border border-primary/20 mb-3">
          <table className="w-full table-fixed">
            <tbody>
              <tr>
                <td className="py-2 px-2 text-[11px] font-bold text-primary w-16">TOTAL</td>
                {METRICS.map(metric => (
                  <td key={metric} className="py-1.5 px-1">
                    <div className="h-6 flex items-center justify-center text-xs font-bold rounded bg-card shadow-sm">
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
