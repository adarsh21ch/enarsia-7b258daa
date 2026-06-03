/**
 * useApplicationSnapshots
 *
 * Computes daily tracking snapshots directly from the prospects table
 * for a given month. Used when the user's tracking source is APPLICATION.
 * Returns data in the same SnapshotRow[] format as usePersonalSnapshotV2Read.
 */
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format, endOfMonth } from 'date-fns';
import type { SnapshotRow } from '@/lib/snapshotSlotUtils';
import { getISTMonthBoundsUTC, getISTDateFromISO } from '@/lib/dateUtils';

export function useApplicationSnapshots(
  monthYear: string,
  leadsTrackingTagNames: string[],
  stageTagNames: string[],
  leadsFinalTargetTag: string | null,
  stageFinalTargetTag: string | null,
) {
  const { user } = useAuth();

  // Fetch all prospects for the month
  const { data: prospects = [], isLoading, refetch } = useQuery({
    queryKey: ['application-snapshots', user?.id, monthYear],
    queryFn: async () => {
      if (!user) return [];

      const { start: monthStartUTC, end: monthEndUTC } = getISTMonthBoundsUTC(monthYear);

      const { data, error } = await supabase
        .from('prospects')
        .select('id, date_added, action_taken, funnel_stage, personal_tags')
        .eq('user_id', user.id)
        .is('deleted_at', null)
        .gte('date_added', monthStartUTC)
        .lte('date_added', monthEndUTC);

      if (error) {
        console.error('useApplicationSnapshots: error fetching prospects', error);
        return [];
      }
      return data || [];
    },
    enabled: !!user && !!monthYear,
    staleTime: 60_000,
    gcTime: 300_000,
  });

  // Group prospects by date and compute SnapshotRow per day
  const snapshots: SnapshotRow[] = useMemo(() => {
    if (!prospects.length) return [];

    // Group by date (YYYY-MM-DD in IST)
    const byDate: Record<string, typeof prospects> = {};
    prospects.forEach((p) => {
      if (!p.date_added) return;
      const dateStr = getISTDateFromISO(p.date_added); // IST-aware date
      if (!byDate[dateStr]) byDate[dateStr] = [];
      byDate[dateStr].push(p);
    });

    // Build snapshot rows
    return Object.entries(byDate)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([dateStr, dayProspects]): SnapshotRow => {
        const totalLeads = dayProspects.length;

        // Initialize tag counters
        const responseTags: Record<string, number> = {};
        leadsTrackingTagNames.forEach((t) => { responseTags[t] = 0; });
        const stTags: Record<string, number> = {};
        stageTagNames.forEach((t) => { stTags[t] = 0; });
        let totalResponses = 0;

        dayProspects.forEach((p: any) => {
          const hasAction = !!p.action_taken;
          const hasPersonalTags = Array.isArray(p.personal_tags) && p.personal_tags.length > 0;

          // B) RESPONSES: count lead if it has ANY tag
          if (hasAction || hasPersonalTags) {
            totalResponses++;
          }

          // C) RESPONSE STAGES (cumulative): backfill from index 0 to matched index
          if (hasAction) {
            const idx = leadsTrackingTagNames.indexOf(p.action_taken);
            if (idx >= 0) {
              for (let i = 0; i <= idx; i++) {
                responseTags[leadsTrackingTagNames[i]]++;
              }
            }
          }

          // D) FUNNEL STAGES (cumulative): backfill from index 0 to matched index
          if (p.funnel_stage) {
            const idx = stageTagNames.indexOf(p.funnel_stage);
            if (idx >= 0) {
              for (let i = 0; i <= idx; i++) {
                stTags[stageTagNames[i]]++;
              }
            }
          }
        });

        const finalTagCount = leadsFinalTargetTag ? (responseTags[leadsFinalTargetTag] || 0) : 0;
        const funnelTagCount = stageFinalTargetTag ? (stTags[stageFinalTargetTag] || 0) : 0;

        return {
          date: dateStr,
          total_leads: totalLeads,
          total_responses: totalResponses,
          response_tags: responseTags,
          stage_tags: stTags,
          final_tag: leadsFinalTargetTag,
          final_tag_count: finalTagCount,
          funnel_tag: stageFinalTargetTag,
          funnel_tag_count: funnelTagCount,
          funnel_start_date: null,
          funnel_day: null,
          source: 'APPLICATION',
          upline_leader_id: null,
        };
      });
  }, [prospects, leadsTrackingTagNames, stageTagNames, leadsFinalTargetTag, stageFinalTargetTag]);

  return { snapshots, loading: isLoading, refetch };
}
