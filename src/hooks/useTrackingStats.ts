/**
 * Shared hook for dynamic tracking stats
 * Used by both /tracking page and Track Up Dashboard
 * 
 * - Leads Tracking: based on Response Tags (action_taken)
 * - Funnel Tracking: based on Stage Tags (funnel_stage) with CUMULATIVE logic
 * 
 * Uses React Query for proper cache invalidation after delete/import operations
 */
import { useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useTrackingFormat } from '@/hooks/useTrackingFormat';
import { format, getDaysInMonth, parse, startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns';
import { useState } from 'react';

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
  const { leadsTrackingTagNames, loading: formatLoading } = useTrackingFormat();
  const queryClient = useQueryClient();
  const [monthYear, setMonthYear] = useState(() => format(new Date(), 'yyyy-MM'));

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

  // Use react-query for proper cache invalidation
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['tracking-leads', user?.id, monthYear, leadsTrackingTagNames],
    queryFn: async () => {
      if (!user) return { dailyMetrics: [], totals: { leads: 0, responses: 0, tagCounts: {} } };

      const monthDate = parse(monthYear, 'yyyy-MM', new Date());
      const monthStart = startOfMonth(monthDate);
      const monthEnd = endOfMonth(monthDate);

      // Fetch ALL prospects in month (no soft-delete column - hard delete only)
      const { data: prospects, error } = await supabase
        .from('prospects')
        .select('id, date_added, action_taken, action_taken_at')
        .eq('user_id', user.id)
        .gte('date_added', monthStart.toISOString())
        .lte('date_added', monthEnd.toISOString());

      if (error) {
        console.error('Error fetching prospects for leads tracking:', error);
        return { dailyMetrics: [], totals: { leads: 0, responses: 0, tagCounts: {} } };
      }

      const now = new Date();
      const tags = leadsTrackingTagNames.length > 0 ? leadsTrackingTagNames : [];
      const numDays = getDaysInMonth(monthDate);

      // Initialize daily metrics
      const metrics: DailyTagMetrics[] = [];
      for (let day = 1; day <= numDays; day++) {
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
      (prospects || []).forEach((p) => {
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

      return { dailyMetrics: metrics, totals: monthlyTotals };
    },
    enabled: !!user && !formatLoading,
    staleTime: 30000, // 30 seconds
  });

  const changeMonth = useCallback((direction: 'prev' | 'next') => {
    const date = parse(monthYear, 'yyyy-MM', new Date());
    const newDate = direction === 'prev' ? subMonths(date, 1) : addMonths(date, 1);
    setMonthYear(format(newDate, 'yyyy-MM'));
  }, [monthYear]);

  const handleRefetch = useCallback(() => {
    refetch();
  }, [refetch]);

  return {
    dailyMetrics: data?.dailyMetrics || [],
    totals: data?.totals || { leads: 0, responses: 0, tagCounts: {} },
    // IMPORTANT: when the query is disabled (enabled: false), React Query reports isLoading=false.
    // If we don't include formatLoading here, TrackUp renders a partial/blank grid first, then "refreshes"
    // once tracking tags load. This prevents that intermediate UI.
    loading: isLoading || formatLoading,
    monthYear,
    changeMonth,
    daysInMonth,
    daysRemaining,
    tags: leadsTrackingTagNames,
    refetch: handleRefetch,
  };
}

/**
 * Funnel Tracking Stats - counts by Stage Tags (funnel_stage)
 * Uses CUMULATIVE "reached stage" logic:
 * - If prospect is at Stage 3, count them in Stage 1 + Stage 2 + Stage 3
 */
export function useFunnelTrackingStats(): TrackingStatsResult {
  const { user } = useAuth();
  const { stageTagNames, loading: formatLoading } = useTrackingFormat();
  const queryClient = useQueryClient();
  const [monthYear, setMonthYear] = useState(() => format(new Date(), 'yyyy-MM'));

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

  // Use react-query for proper cache invalidation
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['tracking-funnel', user?.id, monthYear, stageTagNames],
    queryFn: async () => {
      if (!user) return { dailyMetrics: [], totals: { leads: 0, responses: 0, tagCounts: {} } };

      const monthDate = parse(monthYear, 'yyyy-MM', new Date());
      const monthStart = startOfMonth(monthDate);
      const monthEnd = endOfMonth(monthDate);

      // Fetch ALL prospects in month (hard delete - no deleted_at column)
      const { data: prospects, error } = await supabase
        .from('prospects')
        .select('id, date_added, funnel_stage, funnel_stage_at')
        .eq('user_id', user.id)
        .gte('date_added', monthStart.toISOString())
        .lte('date_added', monthEnd.toISOString());

      if (error) {
        console.error('Error fetching prospects for funnel tracking:', error);
        return { dailyMetrics: [], totals: { leads: 0, responses: 0, tagCounts: {} } };
      }

      const stages = stageTagNames.length > 0 ? stageTagNames : [];
      const now = new Date();
      const numDays = getDaysInMonth(monthDate);

      // Build stage index map for cumulative logic
      const stageIndexMap: Record<string, number> = {};
      stages.forEach((stage, idx) => {
        stageIndexMap[stage] = idx;
      });

      // Initialize daily metrics
      const metrics: DailyTagMetrics[] = [];
      for (let day = 1; day <= numDays; day++) {
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
      (prospects || []).forEach((p) => {
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

      return { dailyMetrics: metrics, totals: monthlyTotals };
    },
    enabled: !!user && !formatLoading,
    staleTime: 30000, // 30 seconds
  });

  const changeMonth = useCallback((direction: 'prev' | 'next') => {
    const date = parse(monthYear, 'yyyy-MM', new Date());
    const newDate = direction === 'prev' ? subMonths(date, 1) : addMonths(date, 1);
    setMonthYear(format(newDate, 'yyyy-MM'));
  }, [monthYear]);

  const handleRefetch = useCallback(() => {
    refetch();
  }, [refetch]);

  return {
    dailyMetrics: data?.dailyMetrics || [],
    totals: data?.totals || { leads: 0, responses: 0, tagCounts: {} },
    // See note in useLeadsTrackingStats(): avoid partial/blank grid render before tags are ready.
    loading: isLoading || formatLoading,
    monthYear,
    changeMonth,
    daysInMonth,
    daysRemaining,
    tags: stageTagNames,
    refetch: handleRefetch,
  };
}
