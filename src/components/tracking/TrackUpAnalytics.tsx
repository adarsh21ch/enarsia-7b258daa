/**
 * TrackUp Analytics Section
 * Combines: Conversion Metrics, Funnel Drop-offs, AI Tip, Daily Insights
 * Lightweight, mobile-first, check once/day design
 */
import { useMemo, useState } from 'react';
import { ConversionMetrics } from './ConversionMetrics';
import { FunnelDropOff } from './FunnelDropOff';
import { AITipCard } from './AITipCard';
import { DailyInsightsCard, generateDailyInsight } from './DailyInsightsCard';
import { WeeklyReportCard, WeeklyReportsList } from './WeeklyReportCard';
import { ChevronDown, ChevronUp, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { startOfWeek, endOfWeek, subWeeks } from 'date-fns';

interface TrackUpAnalyticsProps {
  // Current totals
  leads: number;
  responses: number;
  enrollments: number;
  videosSent: number;
  notPicked: number;
  tagCounts: Record<string, number>;
  // Yesterday's data for trends
  yesterdayLeads?: number;
  yesterdayResponses?: number;
  yesterdayEnrollments?: number;
  yesterdayTagCounts?: Record<string, number>;
  // Funnel data
  funnelCounts?: number[];
  yesterdayFunnelCounts?: number[];
  // Stage tags for funnel analysis
  stageTags?: string[];
}

export function TrackUpAnalytics({
  leads,
  responses,
  enrollments,
  videosSent,
  notPicked,
  tagCounts,
  yesterdayLeads = 0,
  yesterdayResponses = 0,
  yesterdayEnrollments = 0,
  yesterdayTagCounts = {},
  funnelCounts = [],
  yesterdayFunnelCounts = [],
  stageTags = [],
}: TrackUpAnalyticsProps) {
  const [showAnalytics, setShowAnalytics] = useState(true);

  // Calculate funnel drop-offs
  const dropOffs = useMemo(() => {
    const result: number[] = [];
    for (let i = 0; i < funnelCounts.length - 1; i++) {
      const current = funnelCounts[i];
      const next = funnelCounts[i + 1];
      const dropPercent = current > 0 ? ((current - next) / current) * 100 : 0;
      result.push(dropPercent);
    }
    return result;
  }, [funnelCounts]);

  // Generate mock weekly reports (in real app, fetch from DB)
  const weeklyReports = useMemo(() => {
    const now = new Date();
    return [
      {
        weekStart: startOfWeek(subWeeks(now, 0), { weekStartsOn: 1 }),
        weekEnd: endOfWeek(subWeeks(now, 0), { weekStartsOn: 1 }),
        totalLeads: leads,
        responsePercent: leads > 0 ? (responses / leads) * 100 : 0,
        enrollments,
        trend: 'up' as const,
        vsLastWeek: 12,
      },
    ];
  }, [leads, responses, enrollments]);

  // Generate daily insights
  const dailyInsights = useMemo(() => {
    const responseRate = leads > 0 ? (responses / leads) * 100 : 0;
    const enrollRate = responses > 0 ? (enrollments / responses) * 100 : 0;
    const notPickedRate = leads > 0 ? (notPicked / leads) * 100 : 0;
    const yesterdayResponseRate = yesterdayLeads > 0 ? (yesterdayResponses / yesterdayLeads) * 100 : 0;
    const yesterdayEnrollRate = yesterdayResponses > 0 ? (yesterdayEnrollments / yesterdayResponses) * 100 : 0;

    const todayInsight = generateDailyInsight({
      leads,
      responses,
      enrollments,
      responseRate,
      enrollRate,
      notPickedRate,
      yesterdayResponseRate,
      yesterdayEnrollRate,
    });

    if (todayInsight) {
      return [{
        id: 'today',
        date: new Date(),
        message: todayInsight.message,
        type: todayInsight.type,
        isRead: false,
      }];
    }
    return [];
  }, [leads, responses, enrollments, notPicked, yesterdayLeads, yesterdayResponses, yesterdayEnrollments]);

  return (
    <div className="space-y-3">
      {/* Collapsible Analytics Section Header */}
      <button
        onClick={() => setShowAnalytics(!showAnalytics)}
        className="w-full flex items-center justify-between px-3 py-2 bg-card rounded-xl border border-border/50"
      >
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-primary" />
          <span className="font-semibold text-sm">Analytics & Insights</span>
        </div>
        {showAnalytics ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      {showAnalytics && (
        <div className="space-y-3 animate-fade-in">
          {/* AI Tip of the Day - Most prominent */}
          <AITipCard
            leads={leads}
            responses={responses}
            enrollments={enrollments}
            videosSent={videosSent}
            notPicked={notPicked}
            funnelDropOffs={dropOffs}
          />

          {/* Conversion Metrics */}
          <ConversionMetrics
            leads={leads}
            responses={responses}
            enrollments={enrollments}
            yesterdayLeads={yesterdayLeads}
            yesterdayResponses={yesterdayResponses}
            yesterdayEnrollments={yesterdayEnrollments}
          />

          {/* Funnel Drop-Off - Only show if funnel data exists */}
          {funnelCounts.length > 1 && (
            <FunnelDropOff
              funnelCounts={funnelCounts}
              enrollments={enrollments}
              yesterdayFunnelCounts={yesterdayFunnelCounts}
              yesterdayEnrollments={yesterdayEnrollments}
            />
          )}

          {/* Daily Insights */}
          {dailyInsights.length > 0 && (
            <DailyInsightsCard insights={dailyInsights} />
          )}

          {/* Weekly Reports - Compact list */}
          {weeklyReports.length > 0 && (
            <WeeklyReportsList reports={weeklyReports} />
          )}
        </div>
      )}
    </div>
  );
}
