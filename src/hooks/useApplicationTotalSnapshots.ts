/**
 * useApplicationTotalSnapshots
 *
 * Computes total tracking snapshots by merging:
 * 1. Your personal data (respects personalSource: APPLICATION → from prospects, MANUAL → from personal_snapshot_v2)
 * 2. Team members' data (from personal_snapshot_v2 where upline_leader_id = you)
 *
 * Returns SnapshotRow[] — same format as useTotalSnapshotV2Read.
 */
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useApplicationSnapshots } from '@/hooks/useApplicationSnapshots';
import { usePersonalSnapshotV2Read } from '@/hooks/usePersonalSnapshotV2Read';
import { useTrackingSourcePreferences } from '@/hooks/useTrackingSourcePreferences';
import { parseSnapshotRow, hasSlotKeys, slotKeysToTagNames, type SnapshotRow } from '@/lib/snapshotSlotUtils';

export function useApplicationTotalSnapshots(
  monthYear: string,
  leadsTrackingTagNames: string[],
  stageTagNames: string[],
  leadsFinalTargetTag: string | null,
  stageFinalTargetTag: string | null,
) {
  const { user } = useAuth();
  const { personalSource } = useTrackingSourcePreferences();

  // Personal data — from application (prospects table)
  const { snapshots: appPersonalSnapshots } = useApplicationSnapshots(
    monthYear, leadsTrackingTagNames, stageTagNames, leadsFinalTargetTag, stageFinalTargetTag,
  );

  // Personal data — from manual snapshots
  const { snapshots: manualPersonalSnapshots } = usePersonalSnapshotV2Read(
    monthYear, leadsTrackingTagNames, stageTagNames,
  );

  // Pick personal data based on personal source preference
  const mySnapshots = personalSource === 'AUTO' ? appPersonalSnapshots : manualPersonalSnapshots;

  // Fetch team members' personal_snapshot_v2 rows
  const { data: rawTeamSnapshots = [], isLoading } = useQuery({
    queryKey: ['team-member-snapshots', user?.id, monthYear],
    queryFn: async (): Promise<SnapshotRow[]> => {
      if (!user) return [];

      const startDate = `${monthYear}-01`;
      const [year, month] = monthYear.split('-').map(Number);
      const lastDay = new Date(year, month, 0).getDate();
      const endDate = `${monthYear}-${String(lastDay).padStart(2, '0')}`;

      const { data, error } = await supabase
        .from('personal_snapshot_v2')
        .select('*')
        .eq('upline_leader_id', user.id)
        .neq('user_id', user.id)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: true });

      if (error) {
        console.error('Error fetching team snapshots:', error);
        return [];
      }

      return (data || []).map((raw) => parseSnapshotRow(raw));
    },
    enabled: !!user && !!monthYear,
    staleTime: 300_000,
    gcTime: 600_000,
    refetchOnMount: 'always',
  });

  // Post-process team snapshots: convert slot keys to tag names
  const teamSnapshots = useMemo(() => {
    return rawTeamSnapshots.map((row) => {
      const mapped = { ...row };
      if (hasSlotKeys(mapped.response_tags, 'response_tag') && leadsTrackingTagNames.length > 0) {
        mapped.response_tags = slotKeysToTagNames(leadsTrackingTagNames, mapped.response_tags, 'response_tag');
      }
      if (hasSlotKeys(mapped.stage_tags, 'stage_tag') && stageTagNames.length > 0) {
        mapped.stage_tags = slotKeysToTagNames(stageTagNames, mapped.stage_tags, 'stage_tag');
      }
      return mapped;
    });
  }, [rawTeamSnapshots, leadsTrackingTagNames, stageTagNames]);

  // Merge personal + team snapshots per date
  const snapshots: SnapshotRow[] = useMemo(() => {
    const byDate: Record<string, SnapshotRow> = {};

    const addRow = (row: SnapshotRow) => {
      if (!byDate[row.date]) {
        byDate[row.date] = {
          date: row.date,
          total_leads: 0,
          total_responses: 0,
          response_tags: {},
          stage_tags: {},
          final_tag: row.final_tag,
          final_tag_count: 0,
          funnel_tag: row.funnel_tag,
          funnel_tag_count: 0,
          funnel_start_date: null,
          funnel_day: null,
          source: 'AUTO',
          upline_leader_id: null,
        };
      }
      const target = byDate[row.date];
      target.total_leads += row.total_leads;
      target.total_responses += row.total_responses;
      target.final_tag_count += row.final_tag_count;
      target.funnel_tag_count += row.funnel_tag_count;

      // Merge response tags
      Object.entries(row.response_tags).forEach(([key, val]) => {
        target.response_tags[key] = (target.response_tags[key] || 0) + val;
      });

      // Merge stage tags
      Object.entries(row.stage_tags).forEach(([key, val]) => {
        target.stage_tags[key] = (target.stage_tags[key] || 0) + val;
      });
    };

    // Add your personal data
    mySnapshots.forEach(addRow);

    // Add team members' data
    teamSnapshots.forEach(addRow);

    return Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date));
  }, [mySnapshots, teamSnapshots]);

  return { snapshots, loading: isLoading };
}
