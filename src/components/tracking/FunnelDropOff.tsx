/**
 * Funnel Drop-Off Metrics - Shows drop-off percentages between funnels
 * Funnel 1 → 2, Funnel 2 → 3, etc.
 * With visual indicators and color coding
 */
import { useMemo } from 'react';
import { AlertTriangle, TrendingUp, TrendingDown, Minus, ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FunnelDropOffProps {
  funnelCounts: number[]; // [F1 count, F2 count, F3 count, ...]
  enrollments: number;
  // Yesterday's data for trend
  yesterdayFunnelCounts?: number[];
  yesterdayEnrollments?: number;
}

interface DropOffCard {
  label: string;
  dropPercent: number;
  trend: 'up' | 'down' | 'stable'; // up = worse (more drop), down = better
  severity: 'low' | 'medium' | 'high';
}

export function FunnelDropOff({
  funnelCounts,
  enrollments,
  yesterdayFunnelCounts = [],
  yesterdayEnrollments = 0,
}: FunnelDropOffProps) {
  const dropOffs = useMemo((): DropOffCard[] => {
    const result: DropOffCard[] = [];

    // Calculate drop between each funnel
    for (let i = 0; i < funnelCounts.length - 1; i++) {
      const current = funnelCounts[i];
      const next = funnelCounts[i + 1];
      const dropPercent = current > 0 ? ((current - next) / current) * 100 : 0;

      // Yesterday's drop for trend
      const yCurrent = yesterdayFunnelCounts[i] || 0;
      const yNext = yesterdayFunnelCounts[i + 1] || 0;
      const yDropPercent = yCurrent > 0 ? ((yCurrent - yNext) / yCurrent) * 100 : 0;

      const diff = dropPercent - yDropPercent;
      const trend: 'up' | 'down' | 'stable' = 
        Math.abs(diff) < 2 ? 'stable' : diff > 0 ? 'up' : 'down';

      // Severity based on drop percentage
      const severity: 'low' | 'medium' | 'high' =
        dropPercent < 30 ? 'low' : dropPercent < 50 ? 'medium' : 'high';

      result.push({
        label: `F${i + 1} → F${i + 2}`,
        dropPercent,
        trend,
        severity,
      });
    }

    // Add enrollment drop (last funnel → enrollment)
    if (funnelCounts.length > 0) {
      const lastFunnel = funnelCounts[funnelCounts.length - 1];
      const enrollDrop = lastFunnel > 0 ? ((lastFunnel - enrollments) / lastFunnel) * 100 : 0;
      
      const yLastFunnel = yesterdayFunnelCounts[yesterdayFunnelCounts.length - 1] || 0;
      const yEnrollDrop = yLastFunnel > 0 ? ((yLastFunnel - yesterdayEnrollments) / yLastFunnel) * 100 : 0;
      
      const diff = enrollDrop - yEnrollDrop;
      const trend: 'up' | 'down' | 'stable' = 
        Math.abs(diff) < 2 ? 'stable' : diff > 0 ? 'up' : 'down';
      
      const severity: 'low' | 'medium' | 'high' =
        enrollDrop < 30 ? 'low' : enrollDrop < 50 ? 'medium' : 'high';

      result.push({
        label: 'Enroll Drop',
        dropPercent: enrollDrop,
        trend,
        severity,
      });
    }

    return result;
  }, [funnelCounts, enrollments, yesterdayFunnelCounts, yesterdayEnrollments]);

  const getSeverityColor = (severity: 'low' | 'medium' | 'high') => {
    switch (severity) {
      case 'low':
        return { bg: 'bg-emerald-500/10', text: 'text-emerald-600', border: 'border-emerald-500/30' };
      case 'medium':
        return { bg: 'bg-amber-500/10', text: 'text-amber-600', border: 'border-amber-500/30' };
      case 'high':
        return { bg: 'bg-red-500/10', text: 'text-red-600', border: 'border-red-500/30' };
    }
  };

  const TrendIcon = ({ trend }: { trend: 'up' | 'down' | 'stable' }) => {
    switch (trend) {
      case 'up': // More drop = bad
        return <TrendingUp className="h-3 w-3 text-red-500" />;
      case 'down': // Less drop = good
        return <TrendingDown className="h-3 w-3 text-emerald-500" />;
      default:
        return <Minus className="h-3 w-3 text-muted-foreground" />;
    }
  };

  if (dropOffs.length === 0) {
    return null;
  }

  return (
    <div className="bg-card rounded-xl border border-border/50 p-3">
      <div className="flex items-center gap-2 mb-3">
        <div className="p-1.5 rounded-lg bg-orange-500/10">
          <ArrowDown className="h-3.5 w-3.5 text-orange-600" />
        </div>
        <h3 className="font-semibold text-sm">Funnel Drop-Off</h3>
      </div>
      
      <div className="flex gap-2 overflow-x-auto pb-1">
        {dropOffs.map((drop) => {
          const color = getSeverityColor(drop.severity);
          return (
            <div
              key={drop.label}
              className={cn(
                "rounded-lg p-2 border min-w-[80px] flex-shrink-0",
                color.bg,
                color.border
              )}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[9px] font-medium text-muted-foreground">
                  {drop.label}
                </span>
                <TrendIcon trend={drop.trend} />
              </div>
              <div className={cn("text-lg font-bold", color.text)}>
                {drop.dropPercent.toFixed(0)}%
              </div>
              {drop.severity === 'high' && (
                <div className="flex items-center gap-1 mt-1">
                  <AlertTriangle className="h-2.5 w-2.5 text-red-500" />
                  <span className="text-[8px] text-red-500">High</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
