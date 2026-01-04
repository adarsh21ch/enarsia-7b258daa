/**
 * Dynamic Funnel Tracker - KPIs and table based on Stage Tags
 * Uses CUMULATIVE "reached stage" counting logic
 */
import { useFunnelTrackingStats } from '@/hooks/useTrackingStats';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronLeft, ChevronRight, Users, Layers, Calendar, Target, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, parse } from 'date-fns';
import { useRef, useEffect, useState } from 'react';

// Color palette for stages
const STAGE_COLORS = [
  { gradient: 'from-blue-500 to-blue-600', bgGradient: 'from-blue-500/20 to-blue-500/5' },
  { gradient: 'from-violet-500 to-violet-600', bgGradient: 'from-violet-500/20 to-violet-500/5' },
  { gradient: 'from-pink-500 to-pink-600', bgGradient: 'from-pink-500/20 to-pink-500/5' },
  { gradient: 'from-amber-500 to-amber-600', bgGradient: 'from-amber-500/20 to-amber-500/5' },
  { gradient: 'from-emerald-500 to-emerald-600', bgGradient: 'from-emerald-500/20 to-emerald-500/5' },
  { gradient: 'from-cyan-500 to-cyan-600', bgGradient: 'from-cyan-500/20 to-cyan-500/5' },
  { gradient: 'from-orange-500 to-orange-600', bgGradient: 'from-orange-500/20 to-orange-500/5' },
];

function getProgressColor(current: number, goal: number) {
  const percentage = (current / goal) * 100;
  if (percentage >= 80) return 'from-green-400 to-green-500';
  if (percentage >= 50) return 'from-amber-400 to-amber-500';
  return 'from-red-400 to-red-500';
}

interface DynamicFunnelTrackerProps {
  isPro?: boolean;
}

export function DynamicFunnelTracker({ isPro = true }: DynamicFunnelTrackerProps) {
  const { dailyMetrics, totals, loading, monthYear, changeMonth, daysInMonth, daysRemaining, tags } = useFunnelTrackingStats();
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

  // Build KPI items: Total Leads (entered funnel), then each Stage (cumulative)
  interface KpiItem {
    key: string;
    label: string;
    value: number;
    goal: number;
    icon: typeof Users;
    colorIdx?: number;
  }
  
  const kpiItems: KpiItem[] = [
    { key: 'leads', label: 'Total Leads', value: totals.leads, goal: 100, icon: Users },
    ...tags.map((stage, idx) => ({
      key: stage,
      label: `Reached ${stage}`,
      value: totals.tagCounts[stage] || 0,
      goal: Math.max(20, 100 - idx * 15), // Decreasing goals for later stages
      icon: Layers,
      colorIdx: idx,
    })),
  ];

  return (
    <div className="flex flex-col h-full animate-fade-in">
      {/* Sticky Table Header */}
      {isHeaderSticky && (
        <div className="fixed top-12 left-0 right-0 z-30 bg-card shadow-md border-b border-border/30">
          <table className="w-full table-fixed">
            <thead>
              <tr>
                <th className="py-1 px-2 text-left text-[10px] font-semibold text-muted-foreground w-16">Date</th>
                <th className="py-1 px-1 text-center text-[10px] font-semibold bg-gradient-to-b from-primary/20 to-primary/5">Leads</th>
                {tags.map((stage, idx) => (
                  <th key={stage} className={cn("py-1 px-1 text-center text-[10px] font-semibold bg-gradient-to-b", STAGE_COLORS[idx % STAGE_COLORS.length].bgGradient)}>
                    {stage}
                  </th>
                ))}
              </tr>
            </thead>
          </table>
        </div>
      )}

      {/* Scrollable Content */}
      <div 
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto overflow-x-hidden pb-4"
        style={{ paddingTop: isHeaderSticky ? '36px' : '0' }}
      >
        {/* Dynamic KPI Cards */}
        <div className="grid grid-cols-2 gap-1.5 mb-2">
          {kpiItems.slice(0, 8).map((item, i) => {
            const colorConfig = item.colorIdx !== undefined 
              ? STAGE_COLORS[item.colorIdx % STAGE_COLORS.length]
              : { gradient: 'from-primary to-primary/80', bgGradient: 'from-primary/20 to-primary/5' };
            const Icon = item.icon;
            const percentage = Math.min((item.value / item.goal) * 100, 100);
            
            return (
              <div
                key={item.key}
                className={cn(
                  "relative overflow-hidden rounded-lg p-2",
                  "bg-gradient-to-br backdrop-blur-sm",
                  "shadow-sm border border-white/10",
                  colorConfig.bgGradient
                )}
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <div className="flex items-start justify-between mb-0.5">
                  <div className={cn("p-1 rounded bg-gradient-to-br shadow-sm", colorConfig.gradient)}>
                    <Icon className="h-3 w-3 text-white" />
                  </div>
                  <div className="flex items-center gap-0.5 text-[9px] text-muted-foreground">
                    <Target className="h-2.5 w-2.5" />
                    <span>{item.goal}</span>
                  </div>
                </div>
                <p className="text-xl font-bold tracking-tight leading-none">{isPro ? item.value : '–'}</p>
                <p className="text-[9px] text-muted-foreground mt-0.5 truncate">{item.label}</p>
                <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-black/10">
                  <div
                    className={cn("h-full rounded-full transition-all duration-700 bg-gradient-to-r", getProgressColor(item.value, item.goal))}
                    style={{ width: isPro ? `${percentage}%` : '0%' }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Cumulative Info Banner */}
        <div className="bg-muted/50 rounded-lg px-3 py-2 mb-2 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          <p className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Cumulative counting:</span> Prospects at Stage 3 are also counted in Stage 1 & 2
          </p>
        </div>

        {/* Daily Tracking Table */}
        <div className="glass-card rounded-xl overflow-hidden mb-2">
          <div className="px-3 py-1.5 border-b border-border/50">
            <div className="flex items-center gap-2">
              <Calendar className="h-3.5 w-3.5 text-primary" />
              <h3 className="font-semibold text-xs">Daily Funnel Tracking</h3>
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

          {/* Table Header */}
          <div ref={tableHeaderRef} className="bg-card border-b border-border/30 overflow-x-auto">
            <table className="w-full table-fixed min-w-[400px]">
              <thead>
                <tr>
                  <th className="py-1 px-2 text-left text-[10px] font-semibold text-muted-foreground w-16">Date</th>
                  <th className="py-1 px-1 text-center text-[10px] font-semibold bg-gradient-to-b from-primary/20 to-primary/5">Leads</th>
                  {tags.map((stage, idx) => (
                    <th key={stage} className={cn("py-1 px-1 text-center text-[10px] font-semibold bg-gradient-to-b truncate", STAGE_COLORS[idx % STAGE_COLORS.length].bgGradient)}>
                      {stage.length > 8 ? stage.slice(0, 8) + '…' : stage}
                    </th>
                  ))}
                </tr>
              </thead>
            </table>
          </div>

          {/* Date Rows */}
          <div className="bg-background overflow-x-auto">
            <table className="w-full table-fixed min-w-[400px]">
              <tbody>
                {dailyMetrics.map((row, idx) => (
                  <tr key={row.dayNumber} className={cn("border-b border-border/20", idx % 2 === 0 ? "bg-background" : "bg-muted/20")}>
                    <td className="py-1 px-2 text-[10px] font-medium text-muted-foreground w-16 whitespace-nowrap">{row.date}</td>
                    <td className="py-0.5 px-1">
                      <div className="h-5 flex items-center justify-center text-[11px] font-medium rounded bg-background/50">
                        {isPro ? row.leads : '–'}
                      </div>
                    </td>
                    {tags.map(stage => (
                      <td key={stage} className="py-0.5 px-1">
                        <div className="h-5 flex items-center justify-center text-[11px] font-medium rounded bg-background/50">
                          {isPro ? (row.tagCounts[stage] || 0) : '–'}
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* TOTAL Row */}
        <div className="bg-gradient-to-r from-primary/15 via-primary/10 to-primary/5 rounded-xl shadow-md border border-primary/20 mb-3 overflow-x-auto">
          <table className="w-full table-fixed min-w-[400px]">
            <tbody>
              <tr>
                <td className="py-2 px-2 text-[11px] font-bold text-primary w-16">TOTAL</td>
                <td className="py-1.5 px-1">
                  <div className="h-6 flex items-center justify-center text-xs font-bold rounded bg-card shadow-sm">
                    {isPro ? totals.leads : '–'}
                  </div>
                </td>
                {tags.map(stage => (
                  <td key={stage} className="py-1.5 px-1">
                    <div className="h-6 flex items-center justify-center text-xs font-bold rounded bg-card shadow-sm">
                      {isPro ? (totals.tagCounts[stage] || 0) : '–'}
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
