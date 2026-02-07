import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { parseSnapshotRow, type SnapshotRow } from '@/lib/snapshotSlotUtils';

/**
 * Reads personal_snapshot_v2 rows for the current user for a given month.
 * @param monthYear - Format: 'YYYY-MM'
 */
export function usePersonalSnapshotV2Read(monthYear: string) {
  const { user } = useAuth();

  const { data: snapshots = [], isLoading, refetch } = useQuery({
    queryKey: ['personal-snapshot-v2', user?.id, monthYear],
    queryFn: async (): Promise<SnapshotRow[]> => {
      if (!user) return [];

      const startDate = `${monthYear}-01`;
      // Get last day of month
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

      return (data || []).map(parseSnapshotRow);
    },
    enabled: !!user && !!monthYear,
    staleTime: 30_000,
  });

  return { snapshots, loading: isLoading, refetch };
}
