import { useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { parseSnapshotRow, hasSlotKeys, slotKeysToTagNames, type SnapshotRow } from '@/lib/snapshotSlotUtils';

export function useTotalSnapshotV2Read(
  monthYear: string,
  leadsTrackingTagNames: string[] = [],
  stageTagNames: string[] = [],
) {
  const { user } = useAuth();

  const { data: rawSnapshots = [], isLoading, refetch } = useQuery({
    queryKey: ['total-snapshot-v2', user?.id, monthYear],
    queryFn: async (): Promise<SnapshotRow[]> => {
      if (!user) return [];

      const startDate = `${monthYear}-01`;
      const [year, month] = monthYear.split('-').map(Number);
      const lastDay = new Date(year, month, 0).getDate();
      const endDate = `${monthYear}-${String(lastDay).padStart(2, '0')}`;

      const { data, error } = await supabase
        .from('total_snapshot_v2')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: true });

      if (error) {
        console.error('Error fetching total snapshots:', error);
        return [];
      }

      return (data || []).map((raw) => parseSnapshotRow(raw));
    },
    enabled: !!user && !!monthYear,
    staleTime: 300_000,
    gcTime: 600_000,
  });

  // Post-process: convert slot keys to tag names reactively using passed-in names
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
