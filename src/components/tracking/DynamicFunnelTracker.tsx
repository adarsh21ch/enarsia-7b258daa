/**
 * Dynamic Funnel Tracker - Dashboard-style transposed layout
 * Rows = Stages, Columns = Dates (horizontal scroll)
 * Uses CUMULATIVE "reached stage" counting logic
 */
import { useFunnelTrackingStats } from '@/hooks/useTrackingStats';
import { useTrackingFormat } from '@/hooks/useTrackingFormat';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronLeft, ChevronRight, Users, Layers, Calendar, Star, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, parse } from 'date-fns';
import { useRef } from 'react';

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

interface DynamicFunnelTrackerProps {
  isPro?: boolean;
}

export function DynamicFunnelTracker({ isPro = true }: DynamicFunnelTrackerProps) {
  const { dailyMetrics, totals, loading, monthYear, changeMonth, daysInMonth, daysRemaining, tags } = useFunnelTrackingStats();
  const { stageFinalTargetTag } = useTrackingFormat();
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const formattedMonth = format(parse(monthYear, 'yyyy-MM', new Date()), 'MMMM yyyy');

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  // Build stages array with colors
  const stages = tags.map((tag, idx) => ({
    key: tag,
    label: tag,
    color: STAGE_COLORS[idx % STAGE_COLORS.length],
    isFinal: tag === stageFinalTargetTag,
  }));

  return (
    <div className="flex flex-col h-full animate-fade-in space-y-3">
      {/* Summary Header Cards */}
      <div className="bg-card rounded-xl p-3 border border-border/50">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-4">
            <div>
              <span className="text-xs text-muted-foreground">Entry (Leads)</span>
              <p className="text-xl font-bold">{isPro ? totals.leads : '–'}</p>
            </div>
            <div className="w-px h-8 bg-border" />
            {stageFinalTargetTag && (
              <div>
                <div className="flex items-center gap-1">
                  <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
                  <span className="text-xs text-muted-foreground">Final ({stageFinalTargetTag})</span>
                </div>
                <p className="text-xl font-bold">{isPro ? (totals.tagCounts[stageFinalTargetTag] || 0) : '–'}</p>
              </div>
            )}
          </div>
        </div>

        {/* Stage KPI Strip - Horizontal Scroll */}
        <div className="flex gap-2 overflow-x-auto pt-2 pb-1 -mx-1 px-1 scrollbar-hide border-t border-border/50">
          {stages.map((stage) => (
            <div 
              key={stage.key} 
              className={cn(
                "flex items-center gap-1.5 px-2 py-1 rounded-lg shrink-0",
                stage.color.bg,
                stage.isFinal && "ring-1 ring-amber-500/50"
              )}
            >
              {stage.isFinal && <Star className="h-3 w-3 text-amber-500 fill-amber-500" />}
              <span className="text-[10px] font-medium truncate max-w-[60px]">{stage.label}</span>
              <span className="text-xs font-bold">{isPro ? (totals.tagCounts[stage.key] || 0) : '–'}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Cumulative Info Banner */}
      <div className="bg-muted/50 rounded-lg px-3 py-2 flex items-center gap-2">
        <TrendingUp className="h-4 w-4 text-primary shrink-0" />
        <p className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Cumulative counting:</span> Prospects at Stage 3 are also counted in Stage 1 & 2
        </p>
      </div>

      {/* Month Selector */}
      <div className="flex items-center justify-center gap-3 py-2 bg-card rounded-xl border border-border/50">
        <Button variant="ghost" size="icon" onClick={() => changeMonth('prev')} className="h-7 w-7 rounded-full">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="text-center min-w-[130px]">
          <p className="font-semibold text-sm">{formattedMonth}</p>
          <p className="text-[10px] text-muted-foreground">
            <span className="text-primary font-medium">{daysInMonth - daysRemaining}</span>/{daysInMonth} days
            {daysRemaining > 0 && <span className="ml-1">• {daysRemaining} left</span>}
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={() => changeMonth('next')} className="h-7 w-7 rounded-full">
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Transposed Data Grid */}
      <div className="bg-card rounded-xl border border-border/50 overflow-hidden flex-1">
        <div className="px-3 py-2 border-b border-border/50">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-primary" />
            <h3 className="font-semibold text-sm">Daily Funnel Tracking</h3>
          </div>
        </div>

        {/* Scrollable Grid Container */}
        <div className="relative overflow-hidden">
          <div 
            ref={scrollContainerRef}
            className="overflow-x-auto overflow-y-auto max-h-[400px]"
          >
            <table className="w-max min-w-full">
              {/* Header Row - Dates */}
              <thead className="sticky top-0 z-10 bg-card">
                <tr>
                  {/* Sticky First Column - Stage Label */}
                  <th className="sticky left-0 z-20 bg-card py-2 px-3 text-left text-[10px] font-semibold text-muted-foreground border-b border-r border-border/30 min-w-[80px]">
                    Stage
                  </th>
                  {dailyMetrics.map((day) => (
                    <th 
                      key={day.dayNumber} 
                      className="py-2 px-2 text-center text-[10px] font-medium text-muted-foreground border-b border-border/30 min-w-[48px]"
                    >
                      {day.date.split(' ')[0]}
                    </th>
                  ))}
                  {/* Total Column */}
                  <th className="py-2 px-3 text-center text-[10px] font-bold text-primary border-b border-l border-border/30 bg-primary/5 min-w-[56px]">
                    Total
                  </th>
                </tr>
              </thead>

              <tbody>
                {/* Leads Row First */}
                <tr className="bg-background">
                  <td className="sticky left-0 z-10 bg-background py-1.5 px-2 text-xs font-medium border-r border-border/30 min-w-[80px]">
                    <div className="flex items-center gap-1.5">
                      <div className="p-1 rounded bg-primary/10">
                        <Users className="h-3 w-3 text-primary" />
                      </div>
                      <span>Leads</span>
                    </div>
                  </td>
                  
                  {dailyMetrics.map((day) => (
                    <td key={day.dayNumber} className="py-1 px-1 text-center">
                      <div className="h-6 flex items-center justify-center text-[11px] font-medium rounded bg-background/50">
                        {isPro ? (day.leads > 0 ? day.leads : '–') : '–'}
                      </div>
                    </td>
                  ))}
                  
                  <td className="py-1 px-2 text-center border-l border-border/30 bg-primary/5">
                    <div className="h-6 flex items-center justify-center text-xs font-bold rounded bg-card shadow-sm">
                      {isPro ? totals.leads : '–'}
                    </div>
                  </td>
                </tr>

                {/* Stage Rows */}
                {stages.map((stage, stageIdx) => (
                  <tr key={stage.key} className={stageIdx % 2 === 0 ? 'bg-muted/20' : 'bg-background'}>
                    {/* Sticky First Column - Stage Name */}
                    <td className={cn(
                      "sticky left-0 z-10 py-1.5 px-2 text-xs font-medium border-r border-border/30 min-w-[80px]",
                      stageIdx % 2 === 0 ? 'bg-muted/20' : 'bg-background'
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
                    
                    {/* Data Cells */}
                    {dailyMetrics.map((day) => {
                      const value = day.tagCounts[stage.key] || 0;
                      
                      return (
                        <td key={day.dayNumber} className="py-1 px-1 text-center">
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
