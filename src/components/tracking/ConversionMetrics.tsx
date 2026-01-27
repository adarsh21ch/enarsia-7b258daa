/**
 * Conversion Metrics - Small cards showing key conversion percentages
 * Lead → Response %, Response → Enrollment %, Lead → Enrollment %
 * With color-coded styling and trend indicators
 */
import { useMemo } from 'react';
import { TrendingUp, TrendingDown, Minus, ArrowRight, Users, MessageSquare, Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ConversionMetricsProps {
  leads: number;
  responses: number;
  enrollments: number;
  // Yesterday's data for trend calculation
  yesterdayLeads?: number;
  yesterdayResponses?: number;
  yesterdayEnrollments?: number;
}

interface MetricCard {
  label: string;
  from: string;
  to: string;
  percentage: number;
  trend: 'up' | 'down' | 'stable';
  color: { bg: string; text: string; border: string };
}

export function ConversionMetrics({
  leads,
  responses,
  enrollments,
  yesterdayLeads = 0,
  yesterdayResponses = 0,
  yesterdayEnrollments = 0,
}: ConversionMetricsProps) {
  const metrics = useMemo((): MetricCard[] => {
    // Calculate percentages
    const leadToResponse = leads > 0 ? (responses / leads) * 100 : 0;
    const responseToEnroll = responses > 0 ? (enrollments / responses) * 100 : 0;
    const leadToEnroll = leads > 0 ? (enrollments / leads) * 100 : 0;

    // Yesterday's percentages for trend
    const yLTR = yesterdayLeads > 0 ? (yesterdayResponses / yesterdayLeads) * 100 : 0;
    const yRTE = yesterdayResponses > 0 ? (yesterdayEnrollments / yesterdayResponses) * 100 : 0;
    const yLTE = yesterdayLeads > 0 ? (yesterdayEnrollments / yesterdayLeads) * 100 : 0;

    const getTrend = (today: number, yesterday: number): 'up' | 'down' | 'stable' => {
      const diff = today - yesterday;
      if (Math.abs(diff) < 1) return 'stable';
      return diff > 0 ? 'up' : 'down';
    };

    return [
      {
        label: 'Lead → Response',
        from: 'Leads',
        to: 'Response',
        percentage: leadToResponse,
        trend: getTrend(leadToResponse, yLTR),
        color: { bg: 'bg-blue-500/10', text: 'text-blue-600', border: 'border-blue-500/30' },
      },
      {
        label: 'Response → Enroll',
        from: 'Response',
        to: 'Enroll',
        percentage: responseToEnroll,
        trend: getTrend(responseToEnroll, yRTE),
        color: { bg: 'bg-emerald-500/10', text: 'text-emerald-600', border: 'border-emerald-500/30' },
      },
      {
        label: 'Lead → Enroll',
        from: 'Leads',
        to: 'Enroll',
        percentage: leadToEnroll,
        trend: getTrend(leadToEnroll, yLTE),
        color: { bg: 'bg-amber-500/10', text: 'text-amber-600', border: 'border-amber-500/30' },
      },
    ];
  }, [leads, responses, enrollments, yesterdayLeads, yesterdayResponses, yesterdayEnrollments]);

  const TrendIcon = ({ trend }: { trend: 'up' | 'down' | 'stable' }) => {
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
    <div className="bg-card rounded-xl border border-border/50 p-3">
      <div className="flex items-center gap-2 mb-3">
        <div className="p-1.5 rounded-lg bg-primary/10">
          <TrendingUp className="h-3.5 w-3.5 text-primary" />
        </div>
        <h3 className="font-semibold text-sm">Conversion Rates</h3>
      </div>
      
      <div className="grid grid-cols-3 gap-2">
        {metrics.map((metric) => (
          <div
            key={metric.label}
            className={cn(
              "rounded-lg p-2 border",
              metric.color.bg,
              metric.color.border
            )}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[9px] font-medium text-muted-foreground truncate">
                {metric.from} → {metric.to}
              </span>
              <TrendIcon trend={metric.trend} />
            </div>
            <div className={cn("text-lg font-bold", metric.color.text)}>
              {metric.percentage.toFixed(1)}%
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
