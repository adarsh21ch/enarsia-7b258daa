/**
 * React Query based prospects hook with pagination
 * Replaces the context-based approach for better caching and performance
 */
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Prospect, mapOldStatusToNew } from '@/types/prospect';
import { toast } from 'sonner';
import { useCallback, useMemo } from 'react';
import { useEncryption } from '@/hooks/useEncryption';

const PAGE_SIZE = 50;

// Map database prospect to app prospect
const mapDbProspect = (dbProspect: any): Prospect => ({
  ...dbProspect,
  prospect_status: mapOldStatusToNew(dbProspect.prospect_status),
});

interface ProspectPage {
  prospects: Prospect[];
  totalCount: number;
  nextOffset: number | null;
}

export function useProspectsQuery() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { decryptBatch, encryptFields, encryptBatch } = useEncryption();

  // Infinite query for paginated prospects
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetching,
    isFetchingNextPage,
    isLoading,
    refetch,
    isRefetching,
  } = useInfiniteQuery<ProspectPage>({
    queryKey: ['prospects', user?.id],
    queryFn: async ({ pageParam }): Promise<ProspectPage> => {
      if (!user) {
        return { prospects: [], totalCount: 0, nextOffset: null };
      }

      const offset = pageParam as number;

      // Use the paginated function
      const { data, error } = await supabase.rpc('get_prospects_paginated', {
        p_user_id: user.id,
        p_limit: PAGE_SIZE,
        p_offset: offset,
      });

      if (error) {
        console.error('Error fetching prospects:', error);
        throw error;
      }

      const rawProspects = data || [];
      const totalCount = rawProspects.length > 0 ? (rawProspects[0] as any).total_count : 0;

      // Decrypt phone numbers in batch
      const decryptedProspects = await decryptBatch(rawProspects);
      const mappedProspects = decryptedProspects.map(mapDbProspect);

      return {
        prospects: mappedProspects,
        totalCount: Number(totalCount),
        nextOffset: offset + PAGE_SIZE < totalCount ? offset + PAGE_SIZE : null,
      };
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextOffset,
    enabled: !!user,
    staleTime: 60000, // 1 minute
    gcTime: 300000, // 5 minutes
  });

  // Flatten all pages into a single prospects array
  const prospects = useMemo(() => {
    return data?.pages.flatMap((page) => page.prospects) ?? [];
  }, [data]);

  const totalCount = data?.pages[0]?.totalCount ?? 0;
  const loadedCount = prospects.length;

  // Add prospect mutation
  const addMutation = useMutation({
    mutationFn: async (prospect: Partial<Prospect>): Promise<Prospect> => {
      if (!user) throw new Error('Not authenticated');

      let encryptedPhone = prospect.phone!;
      try {
        const encrypted = await encryptFields({ phone: prospect.phone! });
        encryptedPhone = encrypted.phone || prospect.phone!;
      } catch (err) {
        console.error('Failed to encrypt phone:', err);
      }

      const { data, error } = await supabase
        .from('prospects')
        .insert({
          name: prospect.name!,
          phone: encryptedPhone,
          user_id: user.id,
          address: prospect.address || null,
          age_or_dob: (prospect as any).age_or_dob || null,
          gender: (prospect as any).gender || null,
          instagram: (prospect as any).instagram || null,
          profession: (prospect as any).profession || null,
          why_need: prospect.why_need || null,
          notes: prospect.notes || null,
          sheet_id: prospect.sheet_id || null,
          batch_date: prospect.batch_date || new Date().toISOString().split('T')[0],
        })
        .select()
        .single();

      if (error) throw error;
      return mapDbProspect({ ...data, phone: prospect.phone });
    },
    onSuccess: (newProspect) => {
      // Optimistically add to cache
      queryClient.setQueryData(['prospects', user?.id], (old: any) => {
        if (!old) return old;
        const newPages = [...old.pages];
        if (newPages.length > 0) {
          newPages[newPages.length - 1] = {
            ...newPages[newPages.length - 1],
            prospects: [...newPages[newPages.length - 1].prospects, newProspect],
            totalCount: newPages[0].totalCount + 1,
          };
        }
        return { ...old, pages: newPages };
      });
      toast.success('Prospect added');
    },
    onError: () => {
      toast.error('Failed to add prospect');
    },
  });

  // Update prospect mutation with optimistic updates
  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Prospect> }): Promise<Prospect> => {
      if (!user) throw new Error('Not authenticated');

      const dbUpdates: Record<string, any> = {};

      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.phone !== undefined) {
        try {
          const encrypted = await encryptFields({ phone: updates.phone });
          dbUpdates.phone = encrypted.phone || updates.phone;
        } catch (err) {
          dbUpdates.phone = updates.phone;
        }
      }
      if (updates.address !== undefined) dbUpdates.address = updates.address;
      if ((updates as any).age_or_dob !== undefined) dbUpdates.age_or_dob = (updates as any).age_or_dob;
      if ((updates as any).gender !== undefined) dbUpdates.gender = (updates as any).gender;
      if ((updates as any).instagram !== undefined) dbUpdates.instagram = (updates as any).instagram;
      if ((updates as any).profession !== undefined) dbUpdates.profession = (updates as any).profession;
      if (updates.sheet_id !== undefined) dbUpdates.sheet_id = updates.sheet_id;
      if (updates.batch_date !== undefined) dbUpdates.batch_date = updates.batch_date;

      if (updates.funnel_stage !== undefined) {
        dbUpdates.funnel_stage = updates.funnel_stage;
        dbUpdates.funnel_stage_at = new Date().toISOString();
      }
      if (updates.action_taken !== undefined) {
        dbUpdates.action_taken = updates.action_taken;
        dbUpdates.action_taken_at = new Date().toISOString();
      }
      if (updates.prospect_status !== undefined) dbUpdates.prospect_status = updates.prospect_status;
      if (updates.priority !== undefined) dbUpdates.priority = updates.priority;
      if (updates.why_need !== undefined) dbUpdates.why_need = updates.why_need;
      if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
      if (updates.personal_tags !== undefined) dbUpdates.personal_tags = updates.personal_tags;

      if (Object.keys(dbUpdates).length === 0) {
        // Find and return current prospect
        const current = prospects.find((p) => p.id === id);
        if (current) return current;
        throw new Error('Prospect not found');
      }

      const { data, error } = await supabase
        .from('prospects')
        .update(dbUpdates)
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .maybeSingle();

      if (error) throw error;
      if (!data) throw new Error('Update failed');

      return mapDbProspect({ ...data, phone: updates.phone || data.phone });
    },
    onMutate: async ({ id, updates }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['prospects', user?.id] });

      // Snapshot previous value
      const previousData = queryClient.getQueryData(['prospects', user?.id]);

      // Optimistically update
      queryClient.setQueryData(['prospects', user?.id], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page: ProspectPage) => ({
            ...page,
            prospects: page.prospects.map((p: Prospect) =>
              p.id === id ? { ...p, ...updates } : p
            ),
          })),
        };
      });

      return { previousData };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousData) {
        queryClient.setQueryData(['prospects', user?.id], context.previousData);
      }
      toast.error('Failed to update');
    },
  });

  // Delete prospect mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string): Promise<string> => {
      const { error } = await supabase.from('prospects').delete().eq('id', id);
      if (error) throw error;
      return id;
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['prospects', user?.id] });
      const previousData = queryClient.getQueryData(['prospects', user?.id]);

      queryClient.setQueryData(['prospects', user?.id], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page: ProspectPage) => ({
            ...page,
            prospects: page.prospects.filter((p: Prospect) => p.id !== id),
            totalCount: Math.max(0, page.totalCount - 1),
          })),
        };
      });

      return { previousData };
    },
    onError: (err, id, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(['prospects', user?.id], context.previousData);
      }
      toast.error('Failed to delete prospect');
    },
  });

  // Batch reorder using database function
  const reorderMutation = useMutation({
    mutationFn: async (prospectIds: string[]): Promise<boolean> => {
      if (!user) throw new Error('Not authenticated');

      const updates = prospectIds.map((id, index) => ({
        id,
        sort_order: index + 1,
      }));

      // Use direct update since RPC might not be in types yet
      try {
        for (const update of updates) {
          await supabase
            .from('prospects')
            .update({ sort_order: update.sort_order })
            .eq('id', update.id)
            .eq('user_id', user.id);
        }
        return true;
      } catch (err) {
        console.error('Error reordering:', err);
        return false;
      }
    },
    onMutate: async (prospectIds) => {
      await queryClient.cancelQueries({ queryKey: ['prospects', user?.id] });
      const previousData = queryClient.getQueryData(['prospects', user?.id]);

      // Optimistically reorder
      queryClient.setQueryData(['prospects', user?.id], (old: any) => {
        if (!old) return old;
        const allProspects = old.pages.flatMap((page: ProspectPage) => page.prospects);
        const reordered = prospectIds
          .map((id) => allProspects.find((p: Prospect) => p.id === id))
          .filter(Boolean);

        // Put reordered at start, keep rest in original order
        const remaining = allProspects.filter((p: Prospect) => !prospectIds.includes(p.id));
        const newOrder = [...reordered, ...remaining];

        // Rebuild pages
        const newPages = old.pages.map((page: ProspectPage, idx: number) => ({
          ...page,
          prospects: newOrder.slice(idx * PAGE_SIZE, (idx + 1) * PAGE_SIZE),
        }));

        return { ...old, pages: newPages };
      });

      return { previousData };
    },
    onError: (err, ids, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(['prospects', user?.id], context.previousData);
      }
      toast.error('Failed to reorder');
    },
  });

  // Import prospects in batches
  const importProspects = useCallback(
    async (
      prospectsData: Partial<Prospect>[],
      onProgress?: (imported: number, total: number) => void
    ): Promise<{ imported: number; skipped: number }> => {
      if (!user) return { imported: 0, skipped: 0 };

      const validProspects = prospectsData.filter((p) => p.name && p.phone);
      const skipped = prospectsData.length - validProspects.length;

      if (validProspects.length === 0) {
        return { imported: 0, skipped };
      }

      const prospectsToProcess = validProspects.map((p) => ({
        user_id: user.id,
        name: p.name!,
        phone: p.phone!,
        address: p.address || null,
        age_or_dob: (p as any).age_or_dob || null,
        gender: (p as any).gender || null,
        instagram: (p as any).instagram || null,
        profession: (p as any).profession || null,
        sheet_id: p.sheet_id || null,
        batch_date: p.batch_date || new Date().toISOString().split('T')[0],
      }));

      const CHUNK_SIZE = 50;
      const chunks = [];
      for (let i = 0; i < prospectsToProcess.length; i += CHUNK_SIZE) {
        chunks.push(prospectsToProcess.slice(i, i + CHUNK_SIZE));
      }

      let totalImported = 0;

      for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
        const chunk = chunks[chunkIndex];

        // Encrypt chunk
        let encryptedChunk = chunk;
        try {
          encryptedChunk = await encryptBatch(chunk);
        } catch (err) {
          console.error('Failed to encrypt batch:', err);
        }

        const { data, error } = await supabase
          .from('prospects')
          .insert(encryptedChunk as any)
          .select();

        if (error) {
          console.error('Failed to import chunk:', error);
          continue;
        }

        totalImported += data?.length || 0;
        onProgress?.(totalImported, validProspects.length);
      }

      // Invalidate cache to refetch with new data
      queryClient.invalidateQueries({ queryKey: ['prospects', user?.id] });

      return { imported: totalImported, skipped };
    },
    [user, encryptBatch, queryClient]
  );

  // Convenience functions
  const addProspect = useCallback(
    (prospect: Partial<Prospect>) => addMutation.mutateAsync(prospect),
    [addMutation]
  );

  const updateProspect = useCallback(
    (id: string, updates: Partial<Prospect>) => updateMutation.mutateAsync({ id, updates }),
    [updateMutation]
  );

  const deleteProspect = useCallback(
    (id: string) => deleteMutation.mutateAsync(id).then(() => true).catch(() => false),
    [deleteMutation]
  );

  const reorderProspects = useCallback(
    (ids: string[]) => reorderMutation.mutateAsync(ids),
    [reorderMutation]
  );

  return {
    // Data
    prospects,
    totalCount,
    loadedCount,

    // Loading states
    loading: isLoading,
    initialLoadDone: !isLoading,
    isFetching,
    isRefetching,
    isFetchingNextPage,

    // Pagination
    hasNextPage: !!hasNextPage,
    fetchNextPage,

    // CRUD operations
    addProspect,
    updateProspect,
    deleteProspect,
    reorderProspects,
    importProspects,

    // Cache management
    refetch,
    invalidate: () => queryClient.invalidateQueries({ queryKey: ['prospects', user?.id] }),
  };
}
