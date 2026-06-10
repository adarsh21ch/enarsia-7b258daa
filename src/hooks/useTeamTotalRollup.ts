import { useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { slotKeysToTagNames, type SnapshotRow } from '@/lib/snapshotSlotUtils';

/**
 * Server-side rollup of a leader's downline totals for a month.
 * Calls public.get_team_total(leader_id, 'YYYY-MM') which aggregates
 * personal_snapshot_v2 across the leader + every direct downline member.
 */
export function useTeamTotalRollup(
  leaderUserId: string | null | undefined,
  monthYear: string,
  responseTagNames: string[] = [],
  stageTagNames: string[] = [],
) {
  const { data: rawRows = [], isLoading, refetch } = useQuery({
    queryKey: ['team-total-rollup', leaderUserId, monthYear],
    enabled: !!leaderUserId && !!monthYear,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc('get_team_total', {
        p_leader: leaderUserId,
        p_month: monthYear,
      });
      if (error) {
        console.error('get_team_total error', error);
        return [];
      }
      return data || [];
    },
  });

  const snapshots: SnapshotRow[] = useMemo(() => {
    return (rawRows as any[]).map((r) => {
      const responseTags = typeof r.response_tags === 'object' && r.response_tags
        ? (r.response_tags as Record<string, number>)
        : {};
      const stageTags = typeof r.stage_tags === 'object' && r.stage_tags
        ? (r.stage_tags as Record<string, number>)
        : {};
      const mappedResponse = responseTagNames.length
        ? slotKeysToTagNames(responseTagNames, responseTags, 'response_tag')
        : responseTags;
      const mappedStage = stageTagNames.length
        ? slotKeysToTagNames(stageTagNames, stageTags, 'stage_tag')
        : stageTags;
      return {
        date: r.d,
        total_leads: Number(r.total_leads || 0),
        total_responses: Number(r.total_responses || 0),
        response_tags: mappedResponse,
        stage_tags: mappedStage,
        final_tag: null,
        final_tag_count: 0,
        funnel_tag: null,
        funnel_tag_count: 0,
        funnel_start_date: null,
        funnel_day: null,
        source: 'TEAM_MEMBERS',
        upline_leader_id: leaderUserId ?? null,
      } as SnapshotRow;
    });
  }, [rawRows, responseTagNames, stageTagNames, leaderUserId]);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.month === monthYear) refetch();
    };
    window.addEventListener('trackup:personal-snapshot-synced', handler);
    window.addEventListener('trackup:total-snapshot-synced', handler);
    return () => {
      window.removeEventListener('trackup:personal-snapshot-synced', handler);
      window.removeEventListener('trackup:total-snapshot-synced', handler);
    };
  }, [monthYear, refetch]);

  return { snapshots, loading: isLoading, refetch };
}
