/**
 * Dynamic Leads Tracker - Dashboard-style transposed layout
 * Rows = Metrics, Columns = Dates (horizontal scroll)
 * Compact KPIs in single row, no scrolling
 */
import { useLeadsTrackingStats } from '@/hooks/useTrackingStats';
import { useTrackingFormat } from '@/hooks/useTrackingFormat';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronLeft, ChevronRight, Users, MessageSquare, Calendar, Star, Tag } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, parse } from 'date-fns';
import { useRef } from 'react';

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
  isPro?: boolean;
}

export function DynamicLeadsTracker({ isPro = true }: DynamicLeadsTrackerProps) {
  const { dailyMetrics, totals, loading, monthYear, changeMonth, daysInMonth, daysRemaining, tags } = useLeadsTrackingStats();
  const { leadsFinalTargetTag } = useTrackingFormat();
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const formattedMonth = format(parse(monthYear, 'yyyy-MM', new Date()), 'MMMM yyyy');

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-16 rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  // Build metrics array: Leads, Responses, then each Response Tag
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
    <div className="flex flex-col h-full animate-fade-in space-y-3">
      {/* Compact KPI Row - Single line, no scroll */}
      <div className="bg-card rounded-xl p-3 border border-border/50">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Leads */}
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-blue-500/10">
            <Users className="h-3 w-3 text-blue-600" />
            <span className="text-[10px] font-medium text-blue-600">Leads</span>
            <span className="text-xs font-bold">{isPro ? totals.leads : '–'}</span>
          </div>
          
          {/* Responses */}
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-emerald-500/10">
            <MessageSquare className="h-3 w-3 text-emerald-600" />
            <span className="text-[10px] font-medium text-emerald-600">Responses</span>
            <span className="text-xs font-bold">{isPro ? totals.responses : '–'}</span>
          </div>
          
          {/* Response Tags - first 3 only to keep compact */}
          {tags.slice(0, 3).map((tag, idx) => {
            const isFinal = tag === leadsFinalTargetTag;
            const color = METRIC_COLORS.tag[idx % METRIC_COLORS.tag.length];
            return (
              <div 
                key={tag}
                className={cn(
                  "flex items-center gap-1 px-2 py-1 rounded-lg",
                  color.bg,
                  isFinal && "ring-1 ring-amber-500/50"
                )}
              >
                {isFinal && <Star className="h-3 w-3 text-amber-500 fill-amber-500" />}
                <span className="text-[10px] font-medium truncate max-w-[50px]">{tag}</span>
                <span className="text-xs font-bold">{isPro ? (totals.tagCounts[tag] || 0) : '–'}</span>
              </div>
            );
          })}
          
          {/* Active Days */}
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
            {daysRemaining > 0 && <span>{daysRemaining} days left</span>}
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
            <Calendar className="h-4 w-4 text-primary" />
            <h3 className="font-semibold text-sm">Daily Leads Tracking</h3>
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
                  {/* Sticky First Column - Metric Label */}
                  <th className="sticky left-0 z-20 bg-card py-2 px-3 text-left text-[10px] font-semibold text-muted-foreground border-b border-r border-border/30 min-w-[80px]">
                    Metric
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
                {metrics.map((metric, metricIdx) => {
                  const Icon = metric.icon;
                  const isFinal = 'isFinal' in metric && metric.isFinal;
                  
                  return (
                    <tr key={metric.key} className={metricIdx % 2 === 0 ? 'bg-background' : 'bg-muted/20'}>
                      {/* Sticky First Column - Metric Name */}
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
                      
                      {/* Data Cells */}
                      {dailyMetrics.map((day) => {
                        let value = 0;
                        if (metric.key === 'leads') value = day.leads;
                        else if (metric.key === 'responses') value = day.responses;
                        else value = day.tagCounts[metric.key] || 0;
                        
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
      </div>
    </div>
  );
}
