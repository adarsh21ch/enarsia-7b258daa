/**
 * Shared hook for dynamic tracking stats
 * Used by both /tracking page and Track Up Dashboard
 * 
 * - Leads Tracking: based on Response Tags (action_taken)
 * - Funnel Tracking: based on Stage Tags (funnel_stage) with CUMULATIVE logic
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useTrackingFormat } from '@/hooks/useTrackingFormat';
import { format, getDaysInMonth, parse, startOfMonth, endOfMonth } from 'date-fns';

// 5-second confirmation window
const FIVE_SECONDS_MS = 5 * 1000;

export interface DailyTagMetrics {
  date: string;
  dayNumber: number;
  leads: number;
  responses: number;
  tagCounts: Record<string, number>; // Dynamic counts per tag
}

export interface TagTotals {
  leads: number;
  responses: number;
  tagCounts: Record<string, number>; // Dynamic totals per tag
}

export interface TrackingStatsResult {
  dailyMetrics: DailyTagMetrics[];
  totals: TagTotals;
  loading: boolean;
  monthYear: string;
  changeMonth: (direction: 'prev' | 'next') => void;
  daysInMonth: number;
  daysRemaining: number;
  tags: string[]; // The tags used (either response or stage)
  refetch: () => void;
}

/**
 * Leads Tracking Stats - counts by Response Tags (action_taken)
 * Each response tag gets its own column/KPI
 */
export function useLeadsTrackingStats(): TrackingStatsResult {
  const { user } = useAuth();
  const { leadsTrackingTagNames, leadsFinalTargetTag } = useTrackingFormat();
  const [loading, setLoading] = useState(true);
  const [monthYear, setMonthYear] = useState(() => format(new Date(), 'yyyy-MM'));
  const [dailyMetrics, setDailyMetrics] = useState<DailyTagMetrics[]>([]);
  const [totals, setTotals] = useState<TagTotals>({ leads: 0, responses: 0, tagCounts: {} });

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

      // Fetch ALL prospects in month (no pagination limit)
      const { data, error } = await supabase
        .from('prospects')
        .select('id, date_added, action_taken, action_taken_at')
        .eq('user_id', user.id)
        .gte('date_added', monthStart.toISOString())
        .lte('date_added', monthEnd.toISOString());

      if (error) {
        console.error('Error fetching prospects for leads tracking:', error);
        setLoading(false);
        return;
      }

      const prospects = data || [];
      const now = new Date();
      const tags = leadsTrackingTagNames.length > 0 ? leadsTrackingTagNames : [];

      // Initialize daily metrics
      const metrics: DailyTagMetrics[] = [];
      for (let day = 1; day <= daysInMonth; day++) {
        const dateObj = new Date(monthDate.getFullYear(), monthDate.getMonth(), day);
        const tagCounts: Record<string, number> = {};
        tags.forEach(tag => { tagCounts[tag] = 0; });
        
        metrics.push({
          date: format(dateObj, 'd MMM').toUpperCase(),
          dayNumber: day,
          leads: 0,
          responses: 0,
          tagCounts,
        });
      }

      // Aggregate by day
      prospects.forEach((p) => {
        const addedDate = new Date(p.date_added);
        const dayIndex = addedDate.getDate() - 1;
        
        if (dayIndex >= 0 && dayIndex < metrics.length) {
          // Count as lead
          metrics[dayIndex].leads++;

          // Check response tag
          if (p.action_taken) {
            const actionAt = p.action_taken_at ? new Date(p.action_taken_at) : null;
            const isConfirmed = !actionAt || (now.getTime() - actionAt.getTime() >= FIVE_SECONDS_MS);

            if (isConfirmed) {
              // Total responses: count if action matches any tracking tag
              if (tags.length === 0 || tags.includes(p.action_taken)) {
                metrics[dayIndex].responses++;
              }

              // Count per specific tag
              if (tags.includes(p.action_taken)) {
                metrics[dayIndex].tagCounts[p.action_taken]++;
              }
            }
          }
        }
      });

      setDailyMetrics(metrics);

      // Calculate totals
      const monthlyTotals = metrics.reduce(
        (acc, day) => {
          const newTagCounts = { ...acc.tagCounts };
          tags.forEach(tag => {
            newTagCounts[tag] = (newTagCounts[tag] || 0) + day.tagCounts[tag];
          });
          return {
            leads: acc.leads + day.leads,
            responses: acc.responses + day.responses,
            tagCounts: newTagCounts,
          };
        },
        { leads: 0, responses: 0, tagCounts: {} as Record<string, number> }
      );
      setTotals(monthlyTotals);
    } catch (err) {
      console.error('Error in leads tracking fetchData:', err);
    } finally {
      setLoading(false);
    }
  }, [user, monthYear, daysInMonth, leadsTrackingTagNames]);

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
    tags: leadsTrackingTagNames,
    refetch: fetchData,
  };
}

/**
 * Funnel Tracking Stats - counts by Stage Tags (funnel_stage)
 * Uses CUMULATIVE "reached stage" logic:
 * - If prospect is at Stage 3, count them in Stage 1 + Stage 2 + Stage 3
 */
export function useFunnelTrackingStats(): TrackingStatsResult {
  const { user } = useAuth();
  const { stageTagNames } = useTrackingFormat();
  const [loading, setLoading] = useState(true);
  const [monthYear, setMonthYear] = useState(() => format(new Date(), 'yyyy-MM'));
  const [dailyMetrics, setDailyMetrics] = useState<DailyTagMetrics[]>([]);
  const [totals, setTotals] = useState<TagTotals>({ leads: 0, responses: 0, tagCounts: {} });

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

      // Fetch ALL prospects in month
      const { data, error } = await supabase
        .from('prospects')
        .select('id, date_added, funnel_stage, funnel_stage_at')
        .eq('user_id', user.id)
        .gte('date_added', monthStart.toISOString())
        .lte('date_added', monthEnd.toISOString());

      if (error) {
        console.error('Error fetching prospects for funnel tracking:', error);
        setLoading(false);
        return;
      }

      const prospects = data || [];
      const stages = stageTagNames.length > 0 ? stageTagNames : [];
      const now = new Date();

      // Build stage index map for cumulative logic
      const stageIndexMap: Record<string, number> = {};
      stages.forEach((stage, idx) => {
        stageIndexMap[stage] = idx;
      });

      // Initialize daily metrics
      const metrics: DailyTagMetrics[] = [];
      for (let day = 1; day <= daysInMonth; day++) {
        const dateObj = new Date(monthDate.getFullYear(), monthDate.getMonth(), day);
        const tagCounts: Record<string, number> = {};
        stages.forEach(stage => { tagCounts[stage] = 0; });
        
        metrics.push({
          date: format(dateObj, 'd MMM').toUpperCase(),
          dayNumber: day,
          leads: 0,
          responses: 0, // Total with any stage
          tagCounts,
        });
      }

      // Aggregate by day with CUMULATIVE counting
      prospects.forEach((p) => {
        const addedDate = new Date(p.date_added);
        const dayIndex = addedDate.getDate() - 1;
        
        if (dayIndex >= 0 && dayIndex < metrics.length) {
          // Count as lead (total entered funnel)
          metrics[dayIndex].leads++;

          // Check stage with 5-second confirmation
          if (p.funnel_stage) {
            const stageAt = p.funnel_stage_at ? new Date(p.funnel_stage_at) : null;
            const isConfirmed = !stageAt || (now.getTime() - stageAt.getTime() >= FIVE_SECONDS_MS);

            if (isConfirmed) {
              const prospectStageIdx = stageIndexMap[p.funnel_stage];
              
              // CUMULATIVE: count in all stages up to and including their current stage
              if (prospectStageIdx !== undefined) {
                metrics[dayIndex].responses++; // Has any stage
                
                // Count in Stage i if farthestStageIndex >= i
                stages.forEach((stage, stageIdx) => {
                  if (prospectStageIdx >= stageIdx) {
                    metrics[dayIndex].tagCounts[stage]++;
                  }
                });
              } else if (stages.length === 0 && p.funnel_stage) {
                // No configured stages but has funnel_stage - count as response
                metrics[dayIndex].responses++;
              }
            }
          }
        }
      });

      setDailyMetrics(metrics);

      // Calculate totals with cumulative logic
      const monthlyTotals = metrics.reduce(
        (acc, day) => {
          const newTagCounts = { ...acc.tagCounts };
          stages.forEach(stage => {
            newTagCounts[stage] = (newTagCounts[stage] || 0) + day.tagCounts[stage];
          });
          return {
            leads: acc.leads + day.leads,
            responses: acc.responses + day.responses,
            tagCounts: newTagCounts,
          };
        },
        { leads: 0, responses: 0, tagCounts: {} as Record<string, number> }
      );
      setTotals(monthlyTotals);
    } catch (err) {
      console.error('Error in funnel tracking fetchData:', err);
    } finally {
      setLoading(false);
    }
  }, [user, monthYear, daysInMonth, stageTagNames]);

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
    tags: stageTagNames,
    refetch: fetchData,
  };
}
