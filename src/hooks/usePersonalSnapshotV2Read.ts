import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { parseSnapshotRow, hasSlotKeys, slotKeysToTagNames, type SnapshotRow } from '@/lib/snapshotSlotUtils';
import { useTrackingFormat } from '@/hooks/useTrackingFormat';

/**
 * Reads personal_snapshot_v2 rows for the current user for a given month.
 * Converts slot-keyed tags to human-readable names.
 */
export function usePersonalSnapshotV2Read(monthYear: string) {
  const { user } = useAuth();
  const { leadsTrackingTagNames, stageTagNames } = useTrackingFormat();

  const { data: snapshots = [], isLoading, refetch } = useQuery({
    queryKey: ['personal-snapshot-v2', user?.id, monthYear, leadsTrackingTagNames, stageTagNames],
    queryFn: async (): Promise<SnapshotRow[]> => {
      if (!user) return [];

      const startDate = `${monthYear}-01`;
      const [year, month] = monthYear.split('-').map(Number);
      const lastDay = new Date(year, month, 0).getDate();
      const endDate = `${monthYear}-${String(lastDay).padStart(2, '0')}`;

      const { data, error } = await supabase
        .from('personal_snapshot_v2')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: true });

      if (error) {
        console.error('Error fetching personal snapshots:', error);
        return [];
      }

      return (data || []).map((raw) => {
        const row = parseSnapshotRow(raw);
        // Convert slot keys to human-readable tag names if needed
        if (hasSlotKeys(row.response_tags, 'response_tag') && leadsTrackingTagNames.length > 0) {
          row.response_tags = slotKeysToTagNames(leadsTrackingTagNames, row.response_tags, 'response_tag');
        }
        if (hasSlotKeys(row.stage_tags, 'stage_tag') && stageTagNames.length > 0) {
          row.stage_tags = slotKeysToTagNames(stageTagNames, row.stage_tags, 'stage_tag');
        }
        return row;
      });
    },
    enabled: !!user && !!monthYear,
    staleTime: 300_000,
    gcTime: 600_000,
  });

  // Listen for sync events from write hooks
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.month === monthYear) {
        refetch();
      }
    };
    window.addEventListener('trackup:personal-snapshot-synced', handler);
    return () => window.removeEventListener('trackup:personal-snapshot-synced', handler);
  }, [monthYear, refetch]);

  return { snapshots, loading: isLoading, refetch };
}
