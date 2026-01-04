/**
 * Centralized refresh hook for triggering data refresh across the app
 */
import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export function useRefresh() {
  const queryClient = useQueryClient();

  const softRefresh = useCallback(async () => {
    try {
      // Invalidate all queries to trigger refetch
      await queryClient.invalidateQueries();
      toast.success('Data refreshed');
    } catch (error) {
      console.error('Refresh failed:', error);
      toast.error('Refresh failed');
    }
  }, [queryClient]);

  const hardRefresh = useCallback(() => {
    window.location.reload();
  }, []);

  return { softRefresh, hardRefresh };
}
