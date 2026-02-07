import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { parseSnapshotRow, type SnapshotRow } from '@/lib/snapshotSlotUtils';

/**
 * Reads total_snapshot_v2 rows for the current user for a given month.
 * @param monthYear - Format: 'YYYY-MM'
 */
export function useTotalSnapshotV2Read(monthYear: string) {
  const { user } = useAuth();

  const { data: snapshots = [], isLoading, refetch } = useQuery({
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

      return (data || []).map(parseSnapshotRow);
    },
    enabled: !!user && !!monthYear,
    staleTime: 30_000,
  });

  // Listen for sync events from write hooks
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
