/**
 * Dynamic Leads Tracker - Dashboard-style transposed layout
 * Rows = Metrics, Columns = Dates (horizontal scroll)
 * Compact KPIs in single row, no scrolling
 * Today-centered view with auto-scroll and visual highlighting
 * Collapsible insights section below table
 */
import { useLeadsTrackingStats } from '@/hooks/useTrackingStats';
import { useTrackingFormat } from '@/hooks/useTrackingFormat';
import { useHistoricalAccess } from '@/hooks/useHistoricalAccess';
import { usePermissions } from '@/contexts/PermissionsContext';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { UpgradeModal } from '@/components/subscription/UpgradeModal';
import { ChevronLeft, ChevronRight, Users, MessageSquare, Calendar, Star, Tag, ChevronDown, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, parse } from 'date-fns';
import { useRef, useEffect, useState, useMemo } from 'react';
import { ConversionMetrics } from './ConversionMetrics';
import { AITipCard } from './AITipCard';
import { DailyInsightsCard } from './DailyInsightsCard';

// Color palette for metrics
const METRIC_COLORS = {
  leads: { bg: 'bg-blue-500/10', text: 'text-blue-600', border: 'border-blue-500/30' },
  responses: { bg: 'bg-emerald-500/10', text: 'text-emerald-600', border: 'border-emerald-500/30' },
  tag: [
    { bg: 'bg-violet-500/10', text: 'text-violet-600', border: 'border-violet-500/30' },
    { bg: 'bg-orange-500/10', text: 'text-orange-600', border: 'border-orange-500/30' },
    { bg: 'bg-pink-500/10', text: 'text-pink-600', border: 'border-pink-500/30' },
    { bg: 'bg-cyan-500/10', text: 'text-cyan-600', border: 'border-cyan-500/30' },
  ],
};

interface DynamicLeadsTrackerProps {
  leads?: number;
  responses?: number;
  enrollments?: number;
  videosSent?: number;
  notPicked?: number;
  tagCounts?: Record<string, number>;
}

export function DynamicLeadsTracker({ 
  leads = 0,
  responses = 0,
  enrollments = 0,
  videosSent = 0,
  notPicked = 0,
  tagCounts = {}
}: DynamicLeadsTrackerProps) {
  const { checkFeature } = usePermissions();
  const isPro = checkFeature('tracking_tags');
  const { dailyMetrics, totals, loading, monthYear, changeMonth, daysInMonth, daysRemaining, tags } = useLeadsTrackingStats();
  const { leadsFinalTargetTag } = useTrackingFormat();
  const { isDateRestricted, isMonthFullyRestricted, triggerRestriction, showUpgradeModal, setShowUpgradeModal } = useHistoricalAccess();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showInsights, setShowInsights] = useState(false);

  const formattedMonth = format(parse(monthYear, 'yyyy-MM', new Date()), 'MMMM yyyy');

  // Check if entire month is restricted
  const monthRestricted = isMonthFullyRestricted(monthYear, 'leads');

  // Helper: get Date for a day number in current monthYear
  const getDayDate = (dayNumber: number) => {
    const [year, month] = monthYear.split('-').map(Number);
    return new Date(year, month - 1, dayNumber);
  };

  // Check if a day is today
  const isToday = useMemo(() => {
    const now = new Date();
    const currentMonthYear = format(now, 'yyyy-MM');
    const todayDate = now.getDate();
    return (dayNumber: number) => monthYear === currentMonthYear && dayNumber === todayDate;
  }, [monthYear]);

  const todayColumnIndex = useMemo(() => {
    const now = new Date();
    const currentMonthYear = format(now, 'yyyy-MM');
    if (monthYear !== currentMonthYear) return -1;
    return now.getDate() - 1;
  }, [monthYear]);

  // Auto-scroll to center today's date
  useEffect(() => {
    if (!scrollContainerRef.current || loading || todayColumnIndex < 0) return;
    requestAnimationFrame(() => {
      if (!scrollContainerRef.current) return;
      const columnWidth = 48;
      const containerWidth = scrollContainerRef.current.clientWidth;
      const stickyColumnWidth = 80;
      const visibleWidth = containerWidth - stickyColumnWidth;
      const columnsVisible = Math.floor(visibleWidth / columnWidth);
      const centerOffset = Math.floor(columnsVisible / 2);
      const scrollPosition = Math.max(0, (todayColumnIndex - centerOffset) * columnWidth);
      scrollContainerRef.current.scrollLeft = scrollPosition;
    });
  }, [loading, todayColumnIndex, monthYear]);

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-16 rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  const metrics = [
    { key: 'leads', label: 'Leads', icon: Users, color: METRIC_COLORS.leads },
    { key: 'responses', label: 'Responses', icon: MessageSquare, color: METRIC_COLORS.responses },
    ...tags.map((tag, idx) => ({
      key: tag,
      label: tag,
      icon: tag === leadsFinalTargetTag ? Star : Tag,
      color: METRIC_COLORS.tag[idx % METRIC_COLORS.tag.length],
      isFinal: tag === leadsFinalTargetTag,
    })),
  ];

  return (
    <div className="flex flex-col gap-3 animate-fade-in pb-4">
      {/* KPI Summary Row */}
      <div className="sticky top-0 z-30 bg-card/95 backdrop-blur-sm rounded-xl p-3 border border-border/50 shadow-sm">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-blue-500/10">
            <Users className="h-3 w-3 text-blue-600" />
            <span className="text-[10px] font-medium text-blue-600">Leads</span>
            <span className="text-xs font-bold">{isPro ? totals.leads : '–'}</span>
          </div>
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-emerald-500/10">
            <MessageSquare className="h-3 w-3 text-emerald-600" />
            <span className="text-[10px] font-medium text-emerald-600">Responses</span>
            <span className="text-xs font-bold">{isPro ? totals.responses : '–'}</span>
          </div>
          {tags.slice(0, 3).map((tag, idx) => {
            const isFinal = tag === leadsFinalTargetTag;
            const color = METRIC_COLORS.tag[idx % METRIC_COLORS.tag.length];
            return (
              <div key={tag} className={cn("flex items-center gap-1 px-2 py-1 rounded-lg", color.bg, isFinal && "ring-1 ring-amber-500/50")}>
                {isFinal && <Star className="h-3 w-3 text-amber-500 fill-amber-500" />}
                <span className="text-[10px] font-medium truncate max-w-[50px]">{tag}</span>
                <span className="text-xs font-bold">{isPro ? (totals.tagCounts[tag] || 0) : '–'}</span>
              </div>
            );
          })}
          <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-muted/50 ml-auto">
            <Calendar className="h-3 w-3 text-muted-foreground" />
            <span className="text-[10px] font-medium">{daysInMonth - daysRemaining}/{daysInMonth}</span>
          </div>
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
            {!monthRestricted && daysRemaining > 0 && <span>{daysRemaining} days left</span>}
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
            <Calendar className="h-4 w-4 text-primary" />
            <h3 className="font-semibold text-sm">Daily Leads Tracking</h3>
          </div>
        </div>

        <div ref={scrollContainerRef} className="overflow-x-auto">
          <table className="w-max min-w-full">
            <thead className="bg-card">
              <tr>
                <th className="sticky left-0 z-10 bg-card py-2 px-3 text-left text-[10px] font-semibold text-muted-foreground border-b border-r border-border/30 min-w-[80px]">
                  Metric
                </th>
                {dailyMetrics.map((day) => {
                  const isTodayColumn = isToday(day.dayNumber);
                  const dayRestricted = isDateRestricted(getDayDate(day.dayNumber), 'leads');
                  return (
                    <th
                      key={day.dayNumber}
                      className={cn(
                        "py-2 px-2 text-center text-[10px] font-medium text-muted-foreground border-b border-border/30 min-w-[48px]",
                        isTodayColumn && "bg-primary/5 ring-1 ring-inset ring-primary/20",
                        dayRestricted && "opacity-60 cursor-pointer"
                      )}
                      onClick={dayRestricted ? triggerRestriction : undefined}
                    >
                      {day.date.split(' ')[0]}
                      {dayRestricted && <Lock className="h-2.5 w-2.5 mx-auto mt-0.5 text-amber-500" />}
                    </th>
                  );
                })}
                <th className="py-2 px-3 text-center text-[10px] font-bold text-primary border-b border-l border-border/30 bg-primary/5 min-w-[56px]">
                  Total
                </th>
              </tr>
            </thead>

            <tbody>
              {metrics.map((metric, metricIdx) => {
                const Icon = metric.icon;
                const isFinal = 'isFinal' in metric && metric.isFinal;
                return (
                  <tr key={metric.key} className={metricIdx % 2 === 0 ? 'bg-background' : 'bg-muted/20'}>
                    <td className={cn(
                      "sticky left-0 z-10 py-1.5 px-2 text-xs font-medium border-r border-border/30 min-w-[80px]",
                      metricIdx % 2 === 0 ? 'bg-background' : 'bg-muted/20'
                    )}>
                      <div className="flex items-center gap-1.5">
                        <div className={cn("p-1 rounded", metric.color.bg)}>
                          <Icon className={cn("h-3 w-3", metric.color.text, isFinal && "fill-current")} />
                        </div>
                        <span className="truncate max-w-[50px]">{metric.label}</span>
                      </div>
                    </td>
                    {dailyMetrics.map((day) => {
                      const dayRestricted = isDateRestricted(getDayDate(day.dayNumber), 'leads');
                      let value = 0;
                      if (metric.key === 'leads') value = day.leads;
                      else if (metric.key === 'responses') value = day.responses;
                      else value = day.tagCounts[metric.key] || 0;
                      const isTodayColumn = isToday(day.dayNumber);
                      return (
                        <td
                          key={day.dayNumber}
                          className={cn(
                            "py-1 px-1 text-center",
                            isTodayColumn && "bg-primary/5",
                            dayRestricted && "cursor-pointer"
                          )}
                          onClick={dayRestricted ? triggerRestriction : undefined}
                        >
                          <div className="h-6 flex items-center justify-center text-[11px] font-medium rounded bg-background/50">
                            {dayRestricted ? (
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
                        {isPro ? (
                          metric.key === 'leads' ? totals.leads :
                          metric.key === 'responses' ? totals.responses :
                          totals.tagCounts[metric.key] || 0
                        ) : '–'}
                      </div>
                    </td>
                  </tr>
                );
              })}
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
          <ConversionMetrics leads={totals.leads} responses={totals.responses} enrollments={enrollments} />
          <AITipCard leads={totals.leads} responses={totals.responses} enrollments={enrollments} videosSent={videosSent} notPicked={notPicked} />
          <DailyInsightsCard leads={totals.leads} responses={totals.responses} enrollments={enrollments} tagCounts={totals.tagCounts} />
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
