import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';

export interface TotalSnapshotData {
  snapshot_id: string;
  user_id: string;
  upline_leader_id: string | null;
  date: string;
  total_leads: number;
  total_responses: number;
  response_tags: Record<string, number>;
  stage_tags: Record<string, number>;
  funnel_tag_count: number;
  final_tag_count: number;
  funnel_tag: string | null;
  final_tag: string | null;
  funnel_start_date: string | null;
  funnel_day: number | null;
  created_at: string;
  updated_at: string;
}

export interface UpsertTotalSnapshotInput {
  date: string;
  total_leads: number;
  total_responses: number;
  response_tags?: Record<string, number>;
  stage_tags?: Record<string, number>;
  funnel_tag_count?: number;
  final_tag_count?: number;
  funnel_tag?: string | null;
  final_tag?: string | null;
  funnel_start_date?: string | null;
  funnel_day?: number | null;
  upline_leader_id?: string | null;
}

export function useTotalSnapshot() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch all snapshots for the current user
  const {
    data: snapshots,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['total_snapshot_v2', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('total_snapshot_v2')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false });

      if (error) throw error;
      return (data || []) as TotalSnapshotData[];
    },
    enabled: !!user?.id,
  });

  // Fetch snapshot for a specific date
  const fetchSnapshotByDate = useCallback(async (date: Date | string): Promise<TotalSnapshotData | null> => {
    if (!user?.id) return null;

    const dateStr = typeof date === 'string' ? date : format(date, 'yyyy-MM-dd');

    const { data, error } = await supabase
      .from('total_snapshot_v2')
      .select('*')
      .eq('user_id', user.id)
      .eq('date', dateStr)
      .maybeSingle();

    if (error) throw error;
    return data as TotalSnapshotData | null;
  }, [user?.id]);

  // Fetch snapshots for a date range
  const fetchSnapshotsByDateRange = useCallback(async (
    startDate: Date | string,
    endDate: Date | string
  ): Promise<TotalSnapshotData[]> => {
    if (!user?.id) return [];

    const startStr = typeof startDate === 'string' ? startDate : format(startDate, 'yyyy-MM-dd');
    const endStr = typeof endDate === 'string' ? endDate : format(endDate, 'yyyy-MM-dd');

    const { data, error } = await supabase
      .from('total_snapshot_v2')
      .select('*')
      .eq('user_id', user.id)
      .gte('date', startStr)
      .lte('date', endStr)
      .order('date', { ascending: true });

    if (error) throw error;
    return (data || []) as TotalSnapshotData[];
  }, [user?.id]);

  // Fetch downline snapshots (for leaders)
  const fetchDownlineSnapshots = useCallback(async (
    date?: Date | string
  ): Promise<TotalSnapshotData[]> => {
    if (!user?.id) return [];

    let query = supabase
      .from('total_snapshot_v2')
      .select('*')
      .eq('upline_leader_id', user.id);

    if (date) {
      const dateStr = typeof date === 'string' ? date : format(date, 'yyyy-MM-dd');
      query = query.eq('date', dateStr);
    }

    const { data, error } = await query.order('date', { ascending: false });

    if (error) throw error;
    return (data || []) as TotalSnapshotData[];
  }, [user?.id]);

  // Upsert mutation
  const upsertMutation = useMutation({
    mutationFn: async (input: UpsertTotalSnapshotInput) => {
      if (!user?.id) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('total_snapshot_v2')
        .upsert(
          {
            user_id: user.id,
            date: input.date,
            total_leads: input.total_leads,
            total_responses: input.total_responses,
            response_tags: input.response_tags || {},
            stage_tags: input.stage_tags || {},
            funnel_tag_count: input.funnel_tag_count || 0,
            final_tag_count: input.final_tag_count || 0,
            funnel_tag: input.funnel_tag || null,
            final_tag: input.final_tag || null,
            funnel_start_date: input.funnel_start_date || null,
            funnel_day: input.funnel_day || null,
            upline_leader_id: input.upline_leader_id || null,
          },
          { onConflict: 'user_id,date' }
        )
        .select()
        .single();

      if (error) throw error;
      return data as TotalSnapshotData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['total_snapshot_v2', user?.id] });
    },
  });

  // Upsert function wrapper
  const upsertSnapshot = useCallback(async (input: UpsertTotalSnapshotInput) => {
    return upsertMutation.mutateAsync(input);
  }, [upsertMutation]);

  // Upsert today's snapshot helper
  const upsertTodaySnapshot = useCallback(async (
    data: Omit<UpsertTotalSnapshotInput, 'date'>
  ) => {
    const today = format(new Date(), 'yyyy-MM-dd');
    return upsertSnapshot({ ...data, date: today });
  }, [upsertSnapshot]);

  // Delete snapshot
  const deleteMutation = useMutation({
    mutationFn: async (snapshotId: string) => {
      if (!user?.id) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('total_snapshot_v2')
        .delete()
        .eq('snapshot_id', snapshotId)
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['total_snapshot_v2', user?.id] });
    },
  });

  const deleteSnapshot = useCallback(async (snapshotId: string) => {
    return deleteMutation.mutateAsync(snapshotId);
  }, [deleteMutation]);

  return {
    // Data
    snapshots,
    isLoading,
    error,
    
    // Fetch functions
    refetch,
    fetchSnapshotByDate,
    fetchSnapshotsByDateRange,
    fetchDownlineSnapshots,
    
    // Mutations
    upsertSnapshot,
    upsertTodaySnapshot,
    deleteSnapshot,
    isUpserting: upsertMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
