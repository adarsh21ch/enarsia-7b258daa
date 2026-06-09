import { useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { parseSnapshotRow, hasSlotKeys, slotKeysToTagNames, type SnapshotRow } from '@/lib/snapshotSlotUtils';

/**
 * Read total_snapshot_v2 rows for a month.
 * Pass `targetUserId` to read someone else's totals (RLS allows when caller is upline).
 */
export function useTotalSnapshotV2Read(
  monthYear: string,
  leadsTrackingTagNames: string[] = [],
  stageTagNames: string[] = [],
  targetUserId?: string | null,
) {
  const { user } = useAuth();
  const effectiveUserId = targetUserId || user?.id || null;

  const { data: rawSnapshots = [], isLoading, refetch } = useQuery({
    queryKey: ['total-snapshot-v2', effectiveUserId, monthYear],
    queryFn: async (): Promise<SnapshotRow[]> => {
      if (!effectiveUserId) return [];

      const startDate = `${monthYear}-01`;
      const [year, month] = monthYear.split('-').map(Number);
      const lastDay = new Date(year, month, 0).getDate();
      const endDate = `${monthYear}-${String(lastDay).padStart(2, '0')}`;

      const { data, error } = await supabase
        .from('total_snapshot_v2')
        .select('*')
        .eq('user_id', effectiveUserId)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: true });

      if (error) {
        console.error('Error fetching total snapshots:', error);
        return [];
      }

      return (data || []).map((raw) => parseSnapshotRow(raw));
    },
    enabled: !!effectiveUserId && !!monthYear,
    staleTime: 300_000,
    gcTime: 600_000,
  });

  const snapshots = useMemo(() => {
    return rawSnapshots.map((row) => {
      const mapped = { ...row };
      if (hasSlotKeys(mapped.response_tags, 'response_tag') && leadsTrackingTagNames.length > 0) {
        mapped.response_tags = slotKeysToTagNames(leadsTrackingTagNames, mapped.response_tags, 'response_tag');
      }
      if (hasSlotKeys(mapped.stage_tags, 'stage_tag') && stageTagNames.length > 0) {
        mapped.stage_tags = slotKeysToTagNames(stageTagNames, mapped.stage_tags, 'stage_tag');
      }
      return mapped;
    });
  }, [rawSnapshots, leadsTrackingTagNames, stageTagNames]);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.month === monthYear) {
        refetch();
      }
    };
    window.addEventListener('trackup:total-snapshot-synced', handler);
    return () => window.removeEventListener('trackup:total-snapshot-synced', handler);
  }, [monthYear, refetch]);

  return { snapshots, loading: isLoading, refetch };
}
