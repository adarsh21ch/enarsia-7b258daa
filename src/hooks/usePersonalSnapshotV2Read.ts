import { useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { parseSnapshotRow, slotKeysToTagNames, type SnapshotRow } from '@/lib/snapshotSlotUtils';

/**
 * Read personal_snapshot_v2 rows for a month.
 * - By default reads the AUTHENTICATED user's rows.
 * - Pass `targetUserId` to read someone else's rows (e.g. a downline member when
 *   viewing Team Tracking). RLS allows this when the caller is the row's upline.
 */
export function usePersonalSnapshotV2Read(
  monthYear: string,
  leadsTrackingTagNames: string[] = [],
  stageTagNames: string[] = [],
  sourceFilter?: 'MANUAL' | 'APPLICATION' | null,
  targetUserId?: string | null,
) {
  const { user } = useAuth();
  const effectiveUserId = targetUserId || user?.id || null;

  const { data: rawSnapshots = [], isLoading, refetch } = useQuery({
    queryKey: ['personal-snapshot-v2', effectiveUserId, monthYear, sourceFilter ?? 'all'],
    queryFn: async (): Promise<SnapshotRow[]> => {
      if (!effectiveUserId) return [];

      const startDate = `${monthYear}-01`;
      const [year, month] = monthYear.split('-').map(Number);
      const lastDay = new Date(year, month, 0).getDate();
      const endDate = `${monthYear}-${String(lastDay).padStart(2, '0')}`;

      let query = supabase
        .from('personal_snapshot_v2')
        .select('*')
        .eq('user_id', effectiveUserId)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: true });

      if (sourceFilter) {
        query = query.eq('source', sourceFilter);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching personal snapshots:', error);
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
    window.addEventListener('trackup:personal-snapshot-synced', handler);
    return () => window.removeEventListener('trackup:personal-snapshot-synced', handler);
  }, [monthYear, refetch]);

  return { snapshots, loading: isLoading, refetch };
}
