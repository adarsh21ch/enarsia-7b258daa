/**
 * Dynamic Funnel Tracker - Funnel-period based layout
 * Rows = Stages, Columns = Funnel periods (not daily dates)
 * Uses CUMULATIVE "reached stage" counting logic
 * Today-centered view with auto-scroll and visual highlighting
 * Collapsible insights section below table
 */
import { useFunnelTrackingStats } from '@/hooks/useTrackingStats';
import { useTrackingFormat } from '@/hooks/useTrackingFormat';
import { useFunnelConfig } from '@/hooks/useFunnelConfig';
import { useHistoricalAccess } from '@/hooks/useHistoricalAccess';
import { usePermissions } from '@/contexts/PermissionsContext';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { UpgradeModal } from '@/components/subscription/UpgradeModal';
import { ChevronLeft, ChevronRight, Layers, Star, ChevronDown, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, parse } from 'date-fns';
import { useRef, useMemo, useEffect, useState } from 'react';
import { FunnelDropOff } from './FunnelDropOff';
import { AITipCard } from './AITipCard';
import { WeeklyReportCard } from './WeeklyReportCard';

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
  startDay: number;
  endDay: number;
}

interface DynamicFunnelTrackerProps {
  funnelCounts?: number[];
  stageTags?: string[];
}

export function DynamicFunnelTracker({ 
  funnelCounts = [],
  stageTags = []
}: DynamicFunnelTrackerProps) {
  const { checkFeature } = usePermissions();
  const isPro = checkFeature('funnel_analytics');
  const { dailyMetrics, totals, loading, monthYear, changeMonth, daysInMonth, daysRemaining, tags } = useFunnelTrackingStats();
  const { stageFinalTargetTag } = useTrackingFormat();
  const { getEffectiveConfig } = useFunnelConfig();
  const { isDateRestricted, isMonthFullyRestricted, triggerRestriction, showUpgradeModal, setShowUpgradeModal } = useHistoricalAccess();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showInsights, setShowInsights] = useState(false);

  const formattedMonth = format(parse(monthYear, 'yyyy-MM', new Date()), 'MMMM yyyy');
  const effectiveConfig = getEffectiveConfig();
  const funnelLength = effectiveConfig?.funnel_length || 3;

  const monthRestricted = isMonthFullyRestricted(monthYear, 'funnel');

  // Helper: get Date for a day number in current monthYear
  const getDayDate = (dayNumber: number) => {
    const [year, month] = monthYear.split('-').map(Number);
    return new Date(year, month - 1, dayNumber);
  };

  // Group daily metrics into funnel periods
  const funnelPeriods = useMemo((): FunnelPeriod[] => {
    if (!dailyMetrics.length) return [];

    const periods: FunnelPeriod[] = [];
    let periodIndex = 1;

    for (let i = 0; i < dailyMetrics.length; i += funnelLength) {
      const periodDays = dailyMetrics.slice(i, i + funnelLength);
      if (periodDays.length === 0) break;

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
        startDay: periodDays[0].dayNumber,
        endDay: periodDays[periodDays.length - 1].dayNumber,
      });

      periodIndex++;
    }

    return periods;
  }, [dailyMetrics, funnelLength, tags]);

  // Check if a funnel period is restricted (use the last day of the period)
  const isPeriodRestricted = (period: FunnelPeriod) => {
    return isDateRestricted(getDayDate(period.endDay), 'funnel');
  };

  const currentFunnelIndex = useMemo(() => {
    const today = new Date();
    const todayDate = today.getDate();
    const currentMonthYear = format(today, 'yyyy-MM');
    if (monthYear !== currentMonthYear) return -1;
    return Math.floor((todayDate - 1) / funnelLength);
  }, [monthYear, funnelLength]);

  // Auto-scroll to center current funnel
  useEffect(() => {
    if (!scrollContainerRef.current || loading || currentFunnelIndex < 0) return;
    requestAnimationFrame(() => {
      if (!scrollContainerRef.current) return;
      const columnWidth = 60;
      const containerWidth = scrollContainerRef.current.clientWidth;
      const stickyColumnWidth = 80;
      const visibleWidth = containerWidth - stickyColumnWidth;
      const columnsVisible = Math.floor(visibleWidth / columnWidth);
      const centerOffset = Math.floor(columnsVisible / 2);
      const scrollPosition = Math.max(0, (currentFunnelIndex - centerOffset) * columnWidth);
      scrollContainerRef.current.scrollLeft = scrollPosition;
    });
  }, [loading, currentFunnelIndex, monthYear]);

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-20 rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  const stages = tags.map((tag, idx) => ({
    key: tag,
    label: tag,
    color: STAGE_COLORS[idx % STAGE_COLORS.length],
    isFinal: tag === stageFinalTargetTag,
  }));

  const actualFunnelCounts = stageTags.length > 0 ? funnelCounts : tags.map(tag => totals.tagCounts[tag] || 0);

  return (
    <div className="flex flex-col gap-3 animate-fade-in pb-4">
      {/* KPI Summary Row */}
      <div className="sticky top-0 z-30 bg-card/95 backdrop-blur-sm rounded-xl p-3 border border-border/50 shadow-sm">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-blue-500/10">
            <Layers className="h-3 w-3 text-blue-600" />
            <span className="text-[10px] font-medium text-blue-600">Entry</span>
            <span className="text-xs font-bold">{isPro ? totals.responses : '–'}</span>
          </div>
          {stages.map((stage) => (
            <div key={stage.key} className={cn("flex items-center gap-1 px-2 py-1 rounded-lg", stage.color.bg, stage.isFinal && "ring-1 ring-amber-500/50")}>
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
            {monthRestricted && <span className="text-amber-500 flex items-center justify-center gap-1"><Lock className="h-3 w-3" /> Pro only</span>}
            {!monthRestricted && <span>{funnelPeriods.length} funnels ({funnelLength}-day cycles)</span>}
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={() => changeMonth('next')} className="h-7 w-7 rounded-full">
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Data Grid */}
      <div className="bg-card rounded-xl border border-border/50 overflow-hidden">
        <div className="px-3 py-2 border-b border-border/50">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-primary" />
            <h3 className="font-semibold text-sm">Funnel Tracking</h3>
          </div>
        </div>

        <div ref={scrollContainerRef} className="overflow-x-auto">
          <table className="w-max min-w-full">
            <thead className="bg-card">
              <tr>
                <th className="sticky left-0 z-10 bg-card py-2 px-3 text-left text-[10px] font-semibold text-muted-foreground border-b border-r border-border/30 min-w-[80px]">
                  Stage
                </th>
                {funnelPeriods.map((period, idx) => {
                  const isCurrentFunnel = idx === currentFunnelIndex;
                  const restricted = isPeriodRestricted(period);
                  return (
                    <th
                      key={idx}
                      className={cn(
                        "py-2 px-2 text-center border-b border-border/30 min-w-[60px]",
                        isCurrentFunnel && "bg-primary/5 ring-1 ring-inset ring-primary/20",
                        restricted && "opacity-60 cursor-pointer"
                      )}
                      onClick={restricted ? triggerRestriction : undefined}
                    >
                      <div className="text-[10px] font-bold text-foreground">{period.label}</div>
                      <div className="text-[8px] text-muted-foreground">{period.dateRange}</div>
                      {restricted && <Lock className="h-2.5 w-2.5 mx-auto mt-0.5 text-amber-500" />}
                    </th>
                  );
                })}
                <th className="py-2 px-3 text-center text-[10px] font-bold text-primary border-b border-l border-border/30 bg-primary/5 min-w-[56px]">
                  Total
                </th>
              </tr>
            </thead>

            <tbody>
              {stages.map((stage, stageIdx) => (
                <tr key={stage.key} className={stageIdx % 2 === 0 ? 'bg-background' : 'bg-muted/20'}>
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
                  {funnelPeriods.map((period, periodIdx) => {
                    const value = period.tagCounts[stage.key] || 0;
                    const isCurrentFunnel = periodIdx === currentFunnelIndex;
                    const restricted = isPeriodRestricted(period);
                    return (
                      <td
                        key={periodIdx}
                        className={cn(
                          "py-1 px-1 text-center",
                          isCurrentFunnel && "bg-primary/5",
                          restricted && "cursor-pointer"
                        )}
                        onClick={restricted ? triggerRestriction : undefined}
                      >
                        <div className="h-6 flex items-center justify-center text-[11px] font-medium rounded bg-background/50">
                          {restricted ? (
                            <Lock className="h-3 w-3 text-amber-500/70" />
                          ) : (
                            isPro ? (value > 0 ? value : '–') : '–'
                          )}
                        </div>
                      </td>
                    );
                  })}
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

      {/* View Insights */}
      <Collapsible open={showInsights} onOpenChange={setShowInsights}>
        <CollapsibleTrigger asChild>
          <Button variant="outline" className="w-full justify-between py-3 px-4 bg-card border-border/50 hover:bg-muted/50 transition-colors">
            <span className="text-sm font-semibold text-foreground">
              {showInsights ? 'Hide Insights' : 'View Insights'}
            </span>
            <div className={cn("transition-transform duration-200", showInsights && "rotate-180")}>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </div>
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-3 pt-3 data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up overflow-hidden">
          <FunnelDropOff funnelCounts={actualFunnelCounts} stageTags={stageTags.length > 0 ? stageTags : tags} />
          <AITipCard leads={0} responses={totals.responses} enrollments={actualFunnelCounts[actualFunnelCounts.length - 1] || 0} videosSent={0} notPicked={0} />
          <WeeklyReportCard leads={0} responses={totals.responses} enrollments={actualFunnelCounts[actualFunnelCounts.length - 1] || 0} funnelCounts={actualFunnelCounts} stageTags={stageTags.length > 0 ? stageTags : tags} />
        </CollapsibleContent>
      </Collapsible>

      {/* Historical Data Upgrade Modal */}
      <UpgradeModal
        open={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        title="Historical Data is a Pro Feature"
        description="Upgrade to Pro to view past leads and funnel performance data."
      />
    </div>
  );
}
