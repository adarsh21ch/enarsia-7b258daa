/**
 * Dynamic Funnel Tracker - Funnel-period based layout
 * Rows = Stages, Columns = Funnel periods (not daily dates)
 * Uses CUMULATIVE "reached stage" counting logic
 */
import { useFunnelTrackingStats } from '@/hooks/useTrackingStats';
import { useTrackingFormat } from '@/hooks/useTrackingFormat';
import { useFunnelConfig } from '@/hooks/useFunnelConfig';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronLeft, ChevronRight, Layers, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, parse, addDays } from 'date-fns';
import { useRef, useMemo } from 'react';

// Color palette for stages
const STAGE_COLORS = [
  { bg: 'bg-blue-500/10', text: 'text-blue-600', border: 'border-blue-500/30' },
  { bg: 'bg-violet-500/10', text: 'text-violet-600', border: 'border-violet-500/30' },
  { bg: 'bg-pink-500/10', text: 'text-pink-600', border: 'border-pink-500/30' },
  { bg: 'bg-amber-500/10', text: 'text-amber-600', border: 'border-amber-500/30' },
  { bg: 'bg-emerald-500/10', text: 'text-emerald-600', border: 'border-emerald-500/30' },
  { bg: 'bg-cyan-500/10', text: 'text-cyan-600', border: 'border-cyan-500/30' },
  { bg: 'bg-orange-500/10', text: 'text-orange-600', border: 'border-orange-500/30' },
];

interface FunnelPeriod {
  label: string;
  dateRange: string;
  tagCounts: Record<string, number>;
}

interface DynamicFunnelTrackerProps {
  isPro?: boolean;
}

export function DynamicFunnelTracker({ isPro = true }: DynamicFunnelTrackerProps) {
  const { dailyMetrics, totals, loading, monthYear, changeMonth, daysInMonth, daysRemaining, tags } = useFunnelTrackingStats();
  const { stageFinalTargetTag } = useTrackingFormat();
  const { getEffectiveConfig } = useFunnelConfig();
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const formattedMonth = format(parse(monthYear, 'yyyy-MM', new Date()), 'MMMM yyyy');
  const effectiveConfig = getEffectiveConfig();
  const funnelLength = effectiveConfig?.funnel_length || 3;

  // Group daily metrics into funnel periods
  const funnelPeriods = useMemo((): FunnelPeriod[] => {
    if (!dailyMetrics.length) return [];

    const periods: FunnelPeriod[] = [];
    let periodIndex = 1;

    for (let i = 0; i < dailyMetrics.length; i += funnelLength) {
      const periodDays = dailyMetrics.slice(i, i + funnelLength);
      if (periodDays.length === 0) break;

      // Aggregate counts for this period
      const aggregatedCounts: Record<string, number> = {};
      tags.forEach(tag => { aggregatedCounts[tag] = 0; });
      
      periodDays.forEach(day => {
        Object.entries(day.tagCounts).forEach(([tag, count]) => {
          aggregatedCounts[tag] = (aggregatedCounts[tag] || 0) + count;
        });
      });

      const firstDay = periodDays[0].date.split(' ')[0];
      const lastDay = periodDays[periodDays.length - 1].date.split(' ')[0];
      const dateRange = periodDays.length > 1 ? `${firstDay}-${lastDay}` : firstDay;

      periods.push({
        label: `F${periodIndex}`,
        dateRange,
        tagCounts: aggregatedCounts,
      });

      periodIndex++;
    }

    return periods;
  }, [dailyMetrics, funnelLength, tags]);

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-20 rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  // Build stages array with colors (NO "Leads" row)
  const stages = tags.map((tag, idx) => ({
    key: tag,
    label: tag,
    color: STAGE_COLORS[idx % STAGE_COLORS.length],
    isFinal: tag === stageFinalTargetTag,
  }));

  return (
    <div className="flex flex-col h-full animate-fade-in space-y-3">
      {/* Compact Summary Header - Single Row KPIs */}
      <div className="bg-card rounded-xl p-3 border border-border/50">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Entry (Total) */}
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-blue-500/10">
            <Layers className="h-3 w-3 text-blue-600" />
            <span className="text-[10px] font-medium text-blue-600">Entry</span>
            <span className="text-xs font-bold">{isPro ? totals.responses : '–'}</span>
          </div>
          
          {/* Stage KPIs - compact, non-scrolling */}
          {stages.map((stage) => (
            <div 
              key={stage.key} 
              className={cn(
                "flex items-center gap-1 px-2 py-1 rounded-lg",
                stage.color.bg,
                stage.isFinal && "ring-1 ring-amber-500/50"
              )}
            >
              {stage.isFinal && <Star className="h-3 w-3 text-amber-500 fill-amber-500" />}
              <span className="text-[10px] font-medium truncate max-w-[50px]">{stage.label}</span>
              <span className="text-xs font-bold">{isPro ? (totals.tagCounts[stage.key] || 0) : '–'}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Month Selector */}
      <div className="flex items-center justify-center gap-3 py-2 bg-card rounded-xl border border-border/50">
        <Button variant="ghost" size="icon" onClick={() => changeMonth('prev')} className="h-7 w-7 rounded-full">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="text-center min-w-[130px]">
          <p className="font-semibold text-sm">{formattedMonth}</p>
          <p className="text-[10px] text-muted-foreground">
            {funnelPeriods.length} funnels ({funnelLength}-day cycles)
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={() => changeMonth('next')} className="h-7 w-7 rounded-full">
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Funnel-Period Data Grid */}
      <div className="bg-card rounded-xl border border-border/50 overflow-hidden flex-1">
        <div className="px-3 py-2 border-b border-border/50">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-primary" />
            <h3 className="font-semibold text-sm">Funnel Tracking</h3>
          </div>
        </div>

        {/* Scrollable Grid Container */}
        <div className="relative overflow-hidden">
          <div 
            ref={scrollContainerRef}
            className="overflow-x-auto overflow-y-auto max-h-[400px]"
          >
            <table className="w-max min-w-full">
              {/* Header Row - Funnel Periods */}
              <thead className="sticky top-0 z-10 bg-card">
                <tr>
                  {/* Sticky First Column - Stage Label */}
                  <th className="sticky left-0 z-20 bg-card py-2 px-3 text-left text-[10px] font-semibold text-muted-foreground border-b border-r border-border/30 min-w-[80px]">
                    Stage
                  </th>
                  {funnelPeriods.map((period, idx) => (
                    <th 
                      key={idx} 
                      className="py-2 px-2 text-center border-b border-border/30 min-w-[60px]"
                    >
                      <div className="text-[10px] font-bold text-foreground">{period.label}</div>
                      <div className="text-[8px] text-muted-foreground">{period.dateRange}</div>
                    </th>
                  ))}
                  {/* Total Column */}
                  <th className="py-2 px-3 text-center text-[10px] font-bold text-primary border-b border-l border-border/30 bg-primary/5 min-w-[56px]">
                    Total
                  </th>
                </tr>
              </thead>

              <tbody>
                {/* Stage Rows (NO Leads row) */}
                {stages.map((stage, stageIdx) => (
                  <tr key={stage.key} className={stageIdx % 2 === 0 ? 'bg-background' : 'bg-muted/20'}>
                    {/* Sticky First Column - Stage Name */}
                    <td className={cn(
                      "sticky left-0 z-10 py-1.5 px-2 text-xs font-medium border-r border-border/30 min-w-[80px]",
                      stageIdx % 2 === 0 ? 'bg-background' : 'bg-muted/20'
                    )}>
                      <div className="flex items-center gap-1.5">
                        <div className={cn("p-1 rounded", stage.color.bg)}>
                          {stage.isFinal ? (
                            <Star className={cn("h-3 w-3", stage.color.text, "fill-current")} />
                          ) : (
                            <Layers className={cn("h-3 w-3", stage.color.text)} />
                          )}
                        </div>
                        <span className="truncate max-w-[50px]">{stage.label}</span>
                      </div>
                    </td>
                    
                    {/* Data Cells - Funnel Period Values */}
                    {funnelPeriods.map((period, periodIdx) => {
                      const value = period.tagCounts[stage.key] || 0;
                      
                      return (
                        <td key={periodIdx} className="py-1 px-1 text-center">
                          <div className="h-6 flex items-center justify-center text-[11px] font-medium rounded bg-background/50">
                            {isPro ? (value > 0 ? value : '–') : '–'}
                          </div>
                        </td>
                      );
                    })}
                    
                    {/* Total Cell */}
                    <td className="py-1 px-2 text-center border-l border-border/30 bg-primary/5">
                      <div className="h-6 flex items-center justify-center text-xs font-bold rounded bg-card shadow-sm">
                        {isPro ? (totals.tagCounts[stage.key] || 0) : '–'}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
