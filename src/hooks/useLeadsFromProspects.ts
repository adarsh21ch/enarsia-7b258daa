import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useTrackingFormat } from '@/hooks/useTrackingFormat';
import { format, getDaysInMonth, parse, startOfMonth, endOfMonth } from 'date-fns';

export interface DailyLeadMetrics {
  date: string; // "1 December", "2 December", etc.
  dayNumber: number;
  leads: number;
  responses: number;       // Leads with any Leads Tracking Tag applied
  stageLeads: number;      // Leads with any Stage Tracking Tag applied
  videoSent: number;       // Legacy metric (can be customized)
  enrollments: number;     // Final target completions
}

export interface MonthlyTotals {
  leads: number;           // Total leads count (all prospects)
  responses: number;       // Leads with any Leads Tracking Tag
  stageLeads: number;      // Leads with any Stage Tracking Tag
  videoSent: number;       // Legacy
  enrollments: number;     // Final target completions
}

// 5-second confirmation window
const FIVE_SECONDS_MS = 5 * 1000;

export function useLeadsFromProspects() {
  const { user } = useAuth();
  const { leadsTrackingTagNames, stageTagNames, leadsFinalTargetTag, stageFinalTargetTag } = useTrackingFormat();
  const [loading, setLoading] = useState(true);
  const [monthYear, setMonthYear] = useState(() => format(new Date(), 'yyyy-MM'));
  const [dailyMetrics, setDailyMetrics] = useState<DailyLeadMetrics[]>([]);
  const [totals, setTotals] = useState<MonthlyTotals>({ 
    leads: 0, 
    responses: 0, 
    stageLeads: 0,
    videoSent: 0, 
    enrollments: 0 
  });

  const daysInMonth = useMemo(() => {
    const date = parse(monthYear, 'yyyy-MM', new Date());
    return getDaysInMonth(date);
  }, [monthYear]);

  const daysRemaining = useMemo(() => {
    const now = new Date();
    const currentMonthYear = format(now, 'yyyy-MM');
    if (monthYear !== currentMonthYear) return 0;
    return daysInMonth - now.getDate();
  }, [monthYear, daysInMonth]);

  const fetchData = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const monthDate = parse(monthYear, 'yyyy-MM', new Date());
      const monthStart = startOfMonth(monthDate);
      const monthEnd = endOfMonth(monthDate);

      // Fetch all prospects created in this month
      const { data, error } = await supabase
        .from('prospects')
        .select('id, date_added, action_taken, action_taken_at, funnel_stage, funnel_stage_at')
        .eq('user_id', user.id)
        .gte('date_added', monthStart.toISOString())
        .lte('date_added', monthEnd.toISOString());

      if (error) {
        console.error('Error fetching prospects for leads:', error);
        setLoading(false);
        return;
      }

      const prospects = data || [];
      const now = new Date();

      // Initialize daily metrics for all days in month
      const metrics: DailyLeadMetrics[] = [];
      for (let day = 1; day <= daysInMonth; day++) {
        const dateObj = new Date(monthDate.getFullYear(), monthDate.getMonth(), day);
        metrics.push({
          date: format(dateObj, 'd MMM').toUpperCase(),
          dayNumber: day,
          leads: 0,
          responses: 0,
          stageLeads: 0,
          videoSent: 0,
          enrollments: 0,
        });
      }

      // Aggregate prospects by day using tracking tags
      prospects.forEach((p) => {
        const addedDate = new Date(p.date_added);
        const dayIndex = addedDate.getDate() - 1;
        
        if (dayIndex >= 0 && dayIndex < metrics.length) {
          // Count as lead (Total Leads - all prospects regardless of tags)
          metrics[dayIndex].leads++;

          // Check if action/response matches any Leads Tracking Tag
          if (p.action_taken) {
            const actionAt = p.action_taken_at ? new Date(p.action_taken_at) : null;
            const isConfirmed = !actionAt || (now.getTime() - actionAt.getTime() >= FIVE_SECONDS_MS);

            if (isConfirmed) {
              // Total Responses: count if action_taken is in leadsTrackingTagNames
              // If no tracking tags defined, count any non-empty action_taken
              const isLeadsTrackingTag = leadsTrackingTagNames.length > 0 
                ? leadsTrackingTagNames.includes(p.action_taken)
                : !!p.action_taken;
              
              if (isLeadsTrackingTag) {
                metrics[dayIndex].responses++;
              }

              // Enrollments: count if action_taken is the final Leads target
              if (leadsFinalTargetTag && p.action_taken === leadsFinalTargetTag) {
                metrics[dayIndex].enrollments++;
              }

              // Legacy: Video Sent specific count
              if (p.action_taken === 'Video Sent') {
                metrics[dayIndex].videoSent++;
              }
            }
          }

          // Total Stage Leads: count if funnel_stage matches any Stage Tracking Tag
          if (p.funnel_stage) {
            const isStageTag = stageTagNames.length > 0 
              ? stageTagNames.includes(p.funnel_stage)
              : !!p.funnel_stage;
            
            if (isStageTag) {
              metrics[dayIndex].stageLeads++;
            }
          }
        }
      });

      setDailyMetrics(metrics);

      // Calculate totals
      const monthlyTotals = metrics.reduce(
        (acc, day) => ({
          leads: acc.leads + day.leads,
          responses: acc.responses + day.responses,
          stageLeads: acc.stageLeads + day.stageLeads,
          videoSent: acc.videoSent + day.videoSent,
          enrollments: acc.enrollments + day.enrollments,
        }),
        { leads: 0, responses: 0, stageLeads: 0, videoSent: 0, enrollments: 0 }
      );
      setTotals(monthlyTotals);
    } catch (err) {
      console.error('Error in fetchData:', err);
    } finally {
      setLoading(false);
    }
  }, [user, monthYear, daysInMonth, leadsTrackingTagNames, stageTagNames, leadsFinalTargetTag]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const changeMonth = (direction: 'prev' | 'next') => {
    const date = parse(monthYear, 'yyyy-MM', new Date());
    if (direction === 'prev') {
      date.setMonth(date.getMonth() - 1);
    } else {
      date.setMonth(date.getMonth() + 1);
    }
    setMonthYear(format(date, 'yyyy-MM'));
  };

  return {
    dailyMetrics,
    totals,
    loading,
    monthYear,
    changeMonth,
    daysInMonth,
    daysRemaining,
    refetch: fetchData,
  };
}
