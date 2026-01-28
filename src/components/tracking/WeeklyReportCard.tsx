/**
 * Weekly Performance Report Card - Simplified version for embedding
 * Shows summary of weekly stats with AI coaching note
 */
import { Calendar, TrendingUp, TrendingDown, Minus, Star, ChevronRight, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, startOfWeek, endOfWeek } from 'date-fns';
import { useMemo } from 'react';

export interface WeeklyReportCardProps {
  // Simplified props for embedded use
  leads?: number;
  responses?: number;
  enrollments?: number;
  funnelCounts?: number[];
  stageTags?: string[];
  className?: string;
}

export function WeeklyReportCard({
  leads = 0,
  responses = 0,
  enrollments = 0,
  funnelCounts = [],
  stageTags = [],
  className,
}: WeeklyReportCardProps) {
  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 }); // Monday
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
  const dateRange = `${format(weekStart, 'd MMM')} - ${format(weekEnd, 'd MMM')}`;

  // Calculate response rate
  const responsePercent = leads > 0 ? (responses / leads) * 100 : 0;
  
  // Find best and weakest funnel stages
  const { bestStage, weakestStage, trend, aiNote } = useMemo(() => {
    if (stageTags.length === 0 || funnelCounts.length === 0) {
      return {
        bestStage: null,
        weakestStage: null,
        trend: 'stable' as const,
        aiNote: 'Track consistently to get weekly insights.',
      };
    }

    // Calculate conversion rates for each stage
    const rates = funnelCounts.map((count, idx) => {
      const prev = idx === 0 ? responses : funnelCounts[idx - 1];
      return prev > 0 ? (count / prev) * 100 : 0;
    });

    // Find best (highest conversion) and weakest (lowest conversion)
    let maxRate = 0, minRate = 100, maxIdx = 0, minIdx = 0;
    rates.forEach((rate, idx) => {
      if (rate > maxRate) { maxRate = rate; maxIdx = idx; }
      if (rate < minRate && rate > 0) { minRate = rate; minIdx = idx; }
    });

    const bestStage = stageTags[maxIdx] || null;
    const weakestStage = stageTags[minIdx] || null;
    
    // Simple trend based on enrollment rate
    const enrollRate = responses > 0 ? (enrollments / responses) * 100 : 0;
    const trend = enrollRate > 40 ? 'up' : enrollRate < 20 ? 'down' : 'stable';

    // Generate AI note
    let aiNote = 'Keep tracking for personalized insights.';
    if (enrollRate > 40) {
      aiNote = 'Strong week! Maintain this momentum next week.';
    } else if (weakestStage && minRate < 30) {
      aiNote = `Focus on improving ${weakestStage} conversions next week.`;
    } else if (responsePercent > 50) {
      aiNote = 'Good response rate. Push for more enrollments.';
    }

    return { bestStage, weakestStage, trend, aiNote };
  }, [funnelCounts, stageTags, responses, enrollments, responsePercent]);

  const TrendIcon = () => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-3 w-3 text-emerald-500" />;
      case 'down':
        return <TrendingDown className="h-3 w-3 text-red-500" />;
      default:
        return <Minus className="h-3 w-3 text-muted-foreground" />;
    }
  };

  return (
    <div className={cn("bg-card rounded-xl border border-border/50 overflow-hidden", className)}>
      {/* Header */}
      <div className="px-3 py-2 border-b border-border/50 bg-muted/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            <span className="font-semibold text-sm">Weekly Summary</span>
          </div>
          <span className="text-xs text-muted-foreground">{dateRange}</span>
        </div>
      </div>

      {/* Stats */}
      <div className="p-3 space-y-2">
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-blue-500/10 rounded-lg p-2 text-center">
            <p className="text-lg font-bold text-blue-600">{leads}</p>
            <p className="text-[10px] text-muted-foreground">Leads</p>
          </div>
          <div className="bg-emerald-500/10 rounded-lg p-2 text-center">
            <p className="text-lg font-bold text-emerald-600">{responsePercent.toFixed(0)}%</p>
            <p className="text-[10px] text-muted-foreground">Response</p>
          </div>
          <div className="bg-amber-500/10 rounded-lg p-2 text-center">
            <p className="text-lg font-bold text-amber-600">{enrollments}</p>
            <p className="text-[10px] text-muted-foreground">Enrolled</p>
          </div>
        </div>

        {/* Key Insights */}
        <div className="space-y-1.5 pt-2 border-t border-border/30">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Trend</span>
            <div className="flex items-center gap-1">
              <TrendIcon />
              <span className={cn(
                "font-medium",
                trend === 'up' ? 'text-emerald-600' : trend === 'down' ? 'text-red-600' : 'text-muted-foreground'
              )}>
                {trend === 'up' ? 'Improving' : trend === 'down' ? 'Needs work' : 'Stable'}
              </span>
            </div>
          </div>
          
          {bestStage && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Best Stage</span>
              <div className="flex items-center gap-1">
                <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
                <span className="font-medium">{bestStage}</span>
              </div>
            </div>
          )}
          
          {weakestStage && weakestStage !== bestStage && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Needs Attention</span>
              <span className="font-medium text-red-600">{weakestStage}</span>
            </div>
          )}
        </div>

        {/* AI Note */}
        <div className="mt-3 p-2.5 rounded-lg bg-violet-500/10 border border-violet-500/20">
          <div className="flex items-start gap-2">
            <Star className="h-3.5 w-3.5 text-violet-500 mt-0.5 shrink-0" />
            <p className="text-xs text-violet-700 font-medium leading-relaxed">
              {aiNote}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
