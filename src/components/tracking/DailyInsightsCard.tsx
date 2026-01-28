/**
 * Daily Insights Card - Shows last 5 daily insights
 * One insight per day, data-driven, stored for reference
 */
import { Bell, TrendingUp, TrendingDown, AlertCircle, CheckCircle, Info, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, isToday, isYesterday } from 'date-fns';

interface DailyInsight {
  id: string;
  date: Date;
  message: string;
  type: 'success' | 'warning' | 'info';
  isRead: boolean;
}

export interface DailyInsightsCardProps {
  leads?: number;
  responses?: number;
  enrollments?: number;
  tagCounts?: Record<string, number>;
  insights?: DailyInsight[];
  onViewAll?: () => void;
}

export function DailyInsightsCard({ 
  leads = 0, 
  responses = 0, 
  enrollments = 0, 
  tagCounts = {},
  insights: providedInsights, 
  onViewAll 
}: DailyInsightsCardProps) {
  // Generate insights from data if not provided
  const insights = providedInsights || generateInsightsFromData(leads, responses, enrollments, tagCounts);
  const getTypeIcon = (type: 'success' | 'warning' | 'info') => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />;
      case 'warning':
        return <AlertCircle className="h-3.5 w-3.5 text-amber-500" />;
      case 'info':
        return <Info className="h-3.5 w-3.5 text-blue-500" />;
    }
  };

  const getTypeBg = (type: 'success' | 'warning' | 'info') => {
    switch (type) {
      case 'success':
        return 'bg-emerald-500/10 border-emerald-500/20';
      case 'warning':
        return 'bg-amber-500/10 border-amber-500/20';
      case 'info':
        return 'bg-blue-500/10 border-blue-500/20';
    }
  };

  const formatDate = (date: Date) => {
    if (isToday(date)) return 'Today';
    if (isYesterday(date)) return 'Yesterday';
    return format(date, 'd MMM');
  };

  if (insights.length === 0) {
    return (
      <div className="bg-card rounded-xl border border-border/50 p-4 text-center">
        <Bell className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
        <p className="text-xs text-muted-foreground">
          Daily insights will appear here based on your activity
        </p>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl border border-border/50 overflow-hidden">
      {/* Header */}
      <div className="px-3 py-2 border-b border-border/50 bg-muted/30 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-primary" />
          <span className="font-semibold text-sm">Daily Insights</span>
        </div>
        {insights.length > 3 && onViewAll && (
          <button
            onClick={onViewAll}
            className="text-[10px] text-primary font-medium flex items-center gap-0.5"
          >
            View all <ChevronRight className="h-3 w-3" />
          </button>
        )}
      </div>

      {/* Insights List */}
      <div className="divide-y divide-border/30">
        {insights.slice(0, 5).map((insight) => (
          <div
            key={insight.id}
            className={cn(
              "px-3 py-2.5 flex items-start gap-2.5",
              !insight.isRead && "bg-primary/5"
            )}
          >
            <div className={cn(
              "p-1.5 rounded-lg shrink-0 border",
              getTypeBg(insight.type)
            )}>
              {getTypeIcon(insight.type)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs leading-relaxed">{insight.message}</p>
              <p className="text-[10px] text-muted-foreground mt-1">
                {formatDate(insight.date)}
              </p>
            </div>
            {!insight.isRead && (
              <div className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Generate insights from tracking data
 */
export function generateDailyInsight(data: {
  leads: number;
  responses: number;
  enrollments: number;
  responseRate: number;
  enrollRate: number;
  notPickedRate: number;
  yesterdayResponseRate: number;
  yesterdayEnrollRate: number;
}): { message: string; type: 'success' | 'warning' | 'info' } | null {
  const {
    leads,
    responses,
    enrollments,
    responseRate,
    enrollRate,
    notPickedRate,
    yesterdayResponseRate,
    yesterdayEnrollRate,
  } = data;

  // Not enough data
  if (leads < 3) {
    return null;
  }

  // Response rate improved significantly
  if (responseRate > yesterdayResponseRate + 10 && responseRate > 40) {
    return {
      message: `Response rate improved to ${responseRate.toFixed(0)}%! Keep up the momentum.`,
      type: 'success',
    };
  }

  // Response rate dropped significantly
  if (responseRate < yesterdayResponseRate - 15 && yesterdayResponseRate > 30) {
    return {
      message: `Response rate dropped to ${responseRate.toFixed(0)}%. Review your approach today.`,
      type: 'warning',
    };
  }

  // High enrollment rate
  if (enrollRate > 50 && enrollments >= 2) {
    return {
      message: `Excellent! ${enrollRate.toFixed(0)}% enrollment rate today. Note what worked.`,
      type: 'success',
    };
  }

  // Too many not picked
  if (notPickedRate > 50 && leads > 5) {
    return {
      message: `${notPickedRate.toFixed(0)}% calls weren't answered. Try different call timings.`,
      type: 'warning',
    };
  }

  // Good day overall
  if (responseRate > 50 && leads >= 5) {
    return {
      message: `Solid day with ${responseRate.toFixed(0)}% response rate and ${leads} leads.`,
      type: 'info',
    };
  }

  return null;
}

/**
 * Generate insights from current data
 */
function generateInsightsFromData(
  leads: number,
  responses: number,
  enrollments: number,
  tagCounts: Record<string, number>
): DailyInsight[] {
  const insights: DailyInsight[] = [];
  
  const responseRate = leads > 0 ? (responses / leads) * 100 : 0;
  const enrollRate = responses > 0 ? (enrollments / responses) * 100 : 0;
  
  // Low activity insight
  if (leads < 3) {
    insights.push({
      id: 'low-activity',
      date: new Date(),
      message: 'Add more leads for meaningful insights. Aim for 5+ daily.',
      type: 'info',
      isRead: true,
    });
  }
  
  // Good response rate
  if (responseRate > 50 && leads >= 5) {
    insights.push({
      id: 'good-response',
      date: new Date(),
      message: `Strong ${responseRate.toFixed(0)}% response rate! Keep this approach.`,
      type: 'success',
      isRead: true,
    });
  }
  
  // Low response rate
  if (responseRate < 30 && leads >= 5) {
    insights.push({
      id: 'low-response',
      date: new Date(),
      message: `Response rate at ${responseRate.toFixed(0)}%. Try faster follow-ups.`,
      type: 'warning',
      isRead: false,
    });
  }
  
  // High enrollment
  if (enrollRate > 40 && enrollments >= 2) {
    insights.push({
      id: 'high-enroll',
      date: new Date(),
      message: `Excellent ${enrollRate.toFixed(0)}% enrollment rate today!`,
      type: 'success',
      isRead: true,
    });
  }
  
  return insights;
}
