/**
 * React Query based prospects hook with pagination
 * - Paginated with PAGE_SIZE=50
 * - Separate KPI totalCount query (stable, doesn't change on scroll)
 * - queryKey includes sheetId/filters for proper cache separation
 * - Prefetch enabled via IntersectionObserver in ProspectTable
 */
import { useInfiniteQuery, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Prospect, mapOldStatusToNew } from '@/types/prospect';
import { toast } from 'sonner';
import { useCallback, useMemo, useEffect } from 'react';
import { useEncryption } from '@/hooks/useEncryption';
import { getTodayIST } from '@/lib/dateUtils';

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

interface UseProspectsQueryOptions {
  sheetId?: string | null;
  search?: string;
  filterMode?: 'calling' | 'funnel' | 'leads';
  funnelTag?: string | null; // The action_taken tag that marks prospects as "in funnel"
  enabled?: boolean;
}

export function useProspectsQuery(options: UseProspectsQueryOptions = {}) {
  const { sheetId = null, search = '', filterMode = 'calling', funnelTag = null, enabled = true } = options;
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { decryptBatch, encryptFields, encryptBatch } = useEncryption();
  const isQueryEnabled = !!user && enabled;

  // Query key includes sheetId, search, filterMode, funnelTag for PROPER cache separation
  // This ensures each sheet/filter has its own cached pages
  const queryKey = ['prospects', user?.id, sheetId, search, filterMode, funnelTag];

  // Separate query for KPI totals WITH per-tag counts (doesn't change on scroll)
  // Uses SERVER-SIDE filtering for accurate sheet-specific counts
  const { data: kpiData } = useQuery({
    queryKey: ['prospects-kpi', user?.id, sheetId, search, filterMode, funnelTag],
    queryFn: async () => {
      if (!user) return { total: 0, tagCounts: {} };

      // Fetch all prospects for this sheet/filter to compute tag counts
      // This is necessary because we need to count by action_taken/funnel_stage
      // Only count active (non-deleted) prospects
      let query = supabase
        .from('prospects')
        .select('id, action_taken, funnel_stage')
        .eq('user_id', user.id)
        .is('deleted_at', null);  // Only active prospects

      // Apply sheet filter SERVER-SIDE
      if (sheetId) {
        query = query.eq('sheet_id', sheetId);
      }

      // Apply funnel filter SERVER-SIDE for funnel mode
      if (filterMode === 'funnel' && funnelTag) {
        query = query.eq('action_taken', funnelTag);
      }

      // Apply search filter (only for name and notes - phone is encrypted)
      if (search) {
        query = query.or(`name.ilike.%${search}%,notes.ilike.%${search}%`);
      }

      const { data: prospects, error } = await query;

      if (error) {
        console.error('Error fetching KPI data:', error);
        return { total: 0, tagCounts: {} };
      }

      const total = prospects?.length || 0;
      
      // Count by action_taken (response tags) and funnel_stage (stage tags)
      const tagCounts: Record<string, number> = {};
      prospects?.forEach(p => {
        if (p.action_taken) {
          tagCounts[`action:${p.action_taken}`] = (tagCounts[`action:${p.action_taken}`] || 0) + 1;
        }
        if (p.funnel_stage) {
          tagCounts[`stage:${p.funnel_stage}`] = (tagCounts[`stage:${p.funnel_stage}`] || 0) + 1;
        }
      });

      return { total, tagCounts };
    },
    enabled: isQueryEnabled,
    placeholderData: (previousData) => previousData,
    staleTime: 30000, // 30 seconds
    gcTime: 300000, // 5 minutes
  });

  // Infinite query for paginated prospects WITH SERVER-SIDE sheet filtering
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
    queryKey,
    queryFn: async ({ pageParam }): Promise<ProspectPage> => {
      if (!user) {
        return { prospects: [], totalCount: 0, nextOffset: null };
      }

      const offset = pageParam as number;

      // Use DIRECT query with server-side filtering instead of RPC
      // This ensures pagination applies AFTER sheet filter
      // Only fetch active (non-deleted) prospects
      let query = supabase
        .from('prospects')
        .select('*', { count: 'exact' })
        .eq('user_id', user.id)
        .is('deleted_at', null);  // Only active prospects

      // Apply sheet filter SERVER-SIDE (before pagination)
      if (sheetId) {
        query = query.eq('sheet_id', sheetId);
      }

      // Apply funnel filter SERVER-SIDE for funnel mode
      // This ensures we load 50 funnel prospects, not 50 random prospects then filter client-side
      if (filterMode === 'funnel' && funnelTag) {
        query = query.eq('action_taken', funnelTag);
      }

      // Apply search filter SERVER-SIDE (only for name and notes - phone is encrypted)
      // Phone search is handled client-side after decryption
      if (search) {
        query = query.or(`name.ilike.%${search}%,notes.ilike.%${search}%`);
      }

      // Stable ordering
      query = query
        .order('sort_order', { ascending: true, nullsFirst: false })
        .order('date_added', { ascending: false })
        .order('id', { ascending: true });

      // Pagination: range AFTER filters
      query = query.range(offset, offset + PAGE_SIZE - 1);

      const { data: rawProspects, count, error } = await query;

      if (error) {
        console.error('Error fetching prospects:', error);
        throw error;
      }

      const totalCount = count || 0;

      // Decrypt phone numbers in batch
      const decryptedProspects = await decryptBatch(rawProspects || []);
      let mappedProspects = decryptedProspects.map(mapDbProspect);

      // CLIENT-SIDE phone search filter (phone is encrypted in DB, can't search server-side)
      // Apply after decryption to enable partial phone number matching
      if (search) {
        const searchLower = search.toLowerCase().trim();
        // Normalize search: remove common phone prefixes and special chars
        const normalizedSearch = searchLower.replace(/[^0-9a-z]/gi, '');
        
        mappedProspects = mappedProspects.filter(p => {
          // Check if name already matched (server-side) - keep those
          if (p.name.toLowerCase().includes(searchLower)) return true;
          // Check notes (server-side match)
          if (p.notes?.toLowerCase().includes(searchLower)) return true;
          
          // Phone search: normalize and check for partial match
          if (p.phone) {
            const normalizedPhone = p.phone.replace(/[^0-9]/g, '');
            // Match if search digits appear anywhere in phone
            if (normalizedPhone.includes(normalizedSearch)) return true;
            // Also match original phone format
            if (p.phone.toLowerCase().includes(searchLower)) return true;
          }
          return false;
        });
      }

      return {
        prospects: mappedProspects,
        totalCount: totalCount,
        nextOffset: offset + PAGE_SIZE < totalCount ? offset + PAGE_SIZE : null,
      };
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextOffset,
    enabled: isQueryEnabled,
    placeholderData: (previousData) => previousData,
    staleTime: 60000, // 1 minute
    gcTime: 300000, // 5 minutes
  });

  // Flatten all pages into a single prospects array
  const prospects = useMemo(() => {
    return data?.pages.flatMap((page) => page.prospects) ?? [];
  }, [data]);

  // KPI data from separate query (stable, doesn't change on scroll)
  const kpiTotal = kpiData?.total ?? 0;
  const kpiTagCounts = kpiData?.tagCounts ?? {};
  
  // Loaded count from paginated data
  const loadedCount = prospects.length;
  const totalCount = data?.pages[0]?.totalCount ?? 0;

  // Add prospect mutation with daily limit check
  const addMutation = useMutation({
    mutationFn: async (prospect: Partial<Prospect>): Promise<Prospect> => {
      if (!user) throw new Error('Not authenticated');

      // Check daily upload limit before adding
      const { data: limitCheck, error: limitError } = await supabase.rpc('check_upload_limit', {
        p_user_id: user.id,
        p_count: 1,
      });
      
      if (!limitError && limitCheck && !(limitCheck as any).allowed) {
        throw new Error((limitCheck as any).reason || 'Daily upload limit reached');
      }

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
      
      // Increment daily upload count after successful insert
      await supabase.rpc('increment_daily_upload', {
        p_user_id: user.id,
        p_count: 1,
      });
      
      return mapDbProspect({ ...data, phone: prospect.phone });
    },
    onSuccess: (newProspect) => {
      // Invalidate all prospect queries to refetch
      queryClient.invalidateQueries({ queryKey: ['prospects', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['prospects-kpi', user?.id] });
      toast.success('Prospect added');
      // Record streak activity for manual add (fire-and-forget)
      supabase.from('user_daily_activity' as any).upsert(
        { user_id: user!.id, activity_date: new Date().toISOString().split('T')[0], has_activity: true, activity_sources: ['manual_add'] },
        { onConflict: 'user_id,activity_date' }
      ).then(() => {
        queryClient.invalidateQueries({ queryKey: ['user-streak', user?.id] });
      });
    },
    onError: (error: Error) => {
      // Show specific error message for limit errors
      toast.error(error.message || 'Failed to add prospect');
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
      // Cancel outgoing refetches for ALL prospect queries
      await queryClient.cancelQueries({ queryKey: ['prospects', user?.id] });

      // Update ALL cached prospect queries (not just the active one)
      // This ensures Recent tab sees updates from Leads/Funnel tabs immediately
      queryClient.setQueriesData(
        { queryKey: ['prospects', user?.id] },
        (old: any) => {
          if (!old) return old;
          return {
            ...old,
            pages: old.pages.map((page: ProspectPage) => ({
              ...page,
              prospects: page.prospects.map((p: Prospect) =>
                p.id === id ? { ...p, ...updates, updated_at: new Date().toISOString() } : p
              ),
            })),
          };
        }
      );

      return {};
    },
    onError: () => {
      // Refetch all to restore correct state
      queryClient.invalidateQueries({ queryKey: ['prospects', user?.id] });
      toast.error('Failed to update');
    },
    onSuccess: () => {
      // Invalidate KPI to update tag counts
      queryClient.invalidateQueries({ queryKey: ['prospects-kpi', user?.id] });
      // Invalidate ALL prospects queries to get updated_at for Recent tab
      queryClient.invalidateQueries({ queryKey: ['prospects', user?.id] });
      // Invalidate tracking stats so tag changes reflect
      queryClient.invalidateQueries({ queryKey: ['tracking-leads', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['tracking-funnel', user?.id] });
    },
  });

  // Soft-delete prospect mutation - returns deleted prospect for undo
  const deleteMutation = useMutation({
    mutationFn: async (id: string): Promise<Prospect | null> => {
      // Find the prospect before soft-deleting for return value
      const prospectToDelete = prospects.find(p => p.id === id) || null;
      
      // Soft delete: set deleted_at timestamp
      const { error } = await supabase
        .from('prospects')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);
      
      if (error) throw error;
      return prospectToDelete;
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['prospects', user?.id] });
      const previousData = queryClient.getQueryData(queryKey);

      queryClient.setQueryData(queryKey, (old: any) => {
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
    onSuccess: () => {
      // Invalidate KPI to update count
      queryClient.invalidateQueries({ queryKey: ['prospects-kpi', user?.id] });
      // Invalidate tracking stats so deleted leads are not counted
      queryClient.invalidateQueries({ queryKey: ['tracking-leads', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['tracking-funnel', user?.id] });
      // Invalidate deleted prospects query
      queryClient.invalidateQueries({ queryKey: ['deleted-prospects', user?.id] });
    },
    onError: (err, id, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(queryKey, context.previousData);
      }
      toast.error('Failed to delete prospect');
    },
  });

  // Undo soft-delete: clear deleted_at
  const undoDeleteMutation = useMutation({
    mutationFn: async (id: string): Promise<boolean> => {
      const { error } = await supabase
        .from('prospects')
        .update({ deleted_at: null })
        .eq('id', id);
      
      if (error) throw error;
      return true;
    },
    onSuccess: () => {
      // Invalidate all queries to refetch
      queryClient.invalidateQueries({ queryKey: ['prospects', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['prospects-kpi', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['deleted-prospects', user?.id] });
    },
    onError: () => {
      toast.error('Failed to undo delete');
    },
  });

  // Undo bulk soft-delete
  const undoBulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]): Promise<boolean> => {
      const { error } = await supabase
        .from('prospects')
        .update({ deleted_at: null })
        .in('id', ids);
      
      if (error) throw error;
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prospects', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['prospects-kpi', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['deleted-prospects', user?.id] });
    },
    onError: () => {
      toast.error('Failed to undo delete');
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

      // Use batch RPC function for efficiency (single DB call instead of N calls)
      try {
        const { error } = await supabase.rpc('batch_reorder_prospects', {
          p_user_id: user.id,
          p_updates: updates,
        });
        if (error) throw error;
        return true;
      } catch (err) {
        console.error('Error reordering:', err);
        return false;
      }
    },
    onMutate: async (prospectIds) => {
      await queryClient.cancelQueries({ queryKey: ['prospects', user?.id] });
      const previousData = queryClient.getQueryData(queryKey);

      // Optimistically reorder
      queryClient.setQueryData(queryKey, (old: any) => {
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
        queryClient.setQueryData(queryKey, context.previousData);
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

      // Fix: Allow empty phone (phone is optional per validation rules)
      // Previously: p.name && p.phone - this skipped rows with empty phone!
      const validProspects = prospectsData.filter((p) => p.name && p.name.toString().trim());
      const skipped = prospectsData.length - validProspects.length;

      if (validProspects.length === 0) {
        return { imported: 0, skipped };
      }

      // CRITICAL: Preserve Excel row order by assigning sequential sort_order
      // Each prospect gets a sort_order based on its position in the import array
      // We use negative values to ensure imported rows appear BEFORE existing rows
      // (existing rows have null or positive sort_order)
      const timestamp = Date.now();
      const prospectsToProcess = validProspects.map((p, index) => ({
        user_id: user.id,
        name: p.name!,
        phone: p.phone!,
        address: p.address || null,
        age_or_dob: (p as any).age_or_dob || null,
        gender: (p as any).gender || null,
        instagram: (p as any).instagram || null,
        profession: (p as any).profession || null,
        sheet_id: p.sheet_id || null,
        batch_date: p.batch_date || getTodayIST(),
        // Preserve exact Excel row order: row 1 = sort_order 1, row 2 = sort_order 2, etc.
        // Use timestamp offset to keep different imports in separate "batches"
        sort_order: index + 1,
      }));

      const CHUNK_SIZE = 50;
      const chunks = [];
      for (let i = 0; i < prospectsToProcess.length; i += CHUNK_SIZE) {
        chunks.push(prospectsToProcess.slice(i, i + CHUNK_SIZE));
      }

      let totalImported = 0;
      let failedCount = 0;

      for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
        const chunk = chunks[chunkIndex];

        // Encrypt chunk
        let encryptedChunk = chunk;
        try {
          encryptedChunk = await encryptBatch(chunk);
        } catch (err) {
          console.error('Failed to encrypt batch:', err);
          // Track encryption failures
          failedCount += chunk.length;
          continue;
        }

        const { data, error } = await supabase
          .from('prospects')
          .insert(encryptedChunk as any)
          .select();

        if (error) {
          console.error('Failed to import chunk:', error);
          failedCount += chunk.length;
          continue;
        }

        totalImported += data?.length || 0;
        onProgress?.(totalImported, validProspects.length);
      }

      // Log summary for debugging
      if (failedCount > 0) {
        console.warn(`Import summary: ${totalImported} imported, ${skipped} skipped (no name), ${failedCount} failed`);
      }

      // Invalidate ALL prospect queries to refetch with new data
      queryClient.invalidateQueries({ queryKey: ['prospects', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['prospects-kpi', user?.id] });
      // Invalidate tracking stats so imported leads are counted
      queryClient.invalidateQueries({ queryKey: ['tracking-leads', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['tracking-funnel', user?.id] });

      // Record streak activity for import (fire-and-forget)
      if (totalImported > 0) {
        supabase.from('user_daily_activity' as any).upsert(
          { user_id: user!.id, activity_date: getTodayIST(), has_activity: true, activity_sources: ['import'] },
          { onConflict: 'user_id,activity_date' }
        ).then(() => {
          queryClient.invalidateQueries({ queryKey: ['user-streak', user?.id] });
        });
      }

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

  // Bulk delete - delete multiple prospects in a SINGLE database operation
  const bulkDeleteProspects = useCallback(
    async (ids: string[]): Promise<{ deleted: number; prospects: Prospect[] }> => {
      if (!user || ids.length === 0) return { deleted: 0, prospects: [] };
      
      const deletedProspects = prospects.filter(p => ids.includes(p.id));
      
      // Cancel any in-flight queries
      await queryClient.cancelQueries({ queryKey: ['prospects', user?.id] });
      
      // Single bulk delete operation - NO LOOPING
      const { error } = await supabase
        .from('prospects')
        .delete()
        .in('id', ids);
      
      if (error) {
        toast.error('Failed to delete prospects');
        return { deleted: 0, prospects: [] };
      }
      
      // Optimistically update cache
      queryClient.setQueryData(queryKey, (old: any) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page: ProspectPage) => ({
            ...page,
            prospects: page.prospects.filter((p: Prospect) => !ids.includes(p.id)),
            totalCount: Math.max(0, page.totalCount - ids.length),
          })),
        };
      });
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['prospects-kpi', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['tracking-leads', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['tracking-funnel', user?.id] });
      
      return { deleted: deletedProspects.length, prospects: deletedProspects };
    },
    [user, prospects, queryClient, queryKey]
  );

  // Bulk delete by sheet - deletes ALL prospects in a sheet directly on server (bypasses pagination)
  const bulkDeleteBySheet = useCallback(
    async (sheetId: string | null): Promise<{ deleted: number }> => {
      if (!user) return { deleted: 0 };
      
      // First, get the count of prospects to delete
      let countQuery = supabase
        .from('prospects')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id);
      
      if (sheetId !== null) {
        countQuery = countQuery.eq('sheet_id', sheetId);
      }
      
      const { count: totalToDelete } = await countQuery;
      
      if (!totalToDelete || totalToDelete === 0) {
        return { deleted: 0 };
      }
      
      // Cancel any in-flight queries
      await queryClient.cancelQueries({ queryKey: ['prospects', user?.id] });
      
      // Delete directly by sheet_id on server - no ID list needed
      let deleteQuery = supabase
        .from('prospects')
        .delete()
        .eq('user_id', user.id);
      
      if (sheetId !== null) {
        deleteQuery = deleteQuery.eq('sheet_id', sheetId);
      }
      
      const { error } = await deleteQuery;
      
      if (error) {
        toast.error('Failed to delete prospects');
        return { deleted: 0 };
      }
      
      // Clear cache and refetch
      queryClient.setQueryData(queryKey, (old: any) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page: ProspectPage) => ({
            ...page,
            prospects: sheetId === null 
              ? [] 
              : page.prospects.filter((p: Prospect) => p.sheet_id !== sheetId),
            totalCount: 0,
          })),
        };
      });
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['prospects', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['prospects-kpi', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['tracking-leads', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['tracking-funnel', user?.id] });
      
      return { deleted: totalToDelete };
    },
    [user, queryClient, queryKey]
  );

  // Restore - re-add a deleted prospect (used for undo)
  const restoreProspect = useCallback(
    async (prospect: Prospect): Promise<Prospect | null> => {
      try {
        return await addMutation.mutateAsync(prospect);
      } catch {
        return null;
      }
    },
    [addMutation]
  );

  // Restore multiple prospects
  const restoreProspects = useCallback(
    async (prospectsToRestore: Prospect[]): Promise<number> => {
      let restored = 0;
      for (const p of prospectsToRestore) {
        try {
          await addMutation.mutateAsync(p);
          restored++;
        } catch {
          // continue on error
        }
      }
      return restored;
    },
    [addMutation]
  );

  // Fetch ALL prospects for export (bypasses pagination)
  const fetchAllForExport = useCallback(
    async (exportSheetId?: string | null): Promise<Prospect[]> => {
      if (!user) return [];

      const targetSheetId = exportSheetId !== undefined ? exportSheetId : sheetId;
      const allProspects: Prospect[] = [];
      const CHUNK_SIZE = 1000;
      let offset = 0;
      let hasMore = true;

      while (hasMore) {
        let query = supabase
          .from('prospects')
          .select('*')
          .eq('user_id', user.id);

        // Apply sheet filter
        if (targetSheetId) {
          query = query.eq('sheet_id', targetSheetId);
        }

        // Apply search filter
        if (search) {
          query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%,notes.ilike.%${search}%`);
        }

        // Stable ordering
        query = query
          .order('sort_order', { ascending: true, nullsFirst: false })
          .order('date_added', { ascending: false })
          .order('id', { ascending: true })
          .range(offset, offset + CHUNK_SIZE - 1);

        const { data: rawProspects, error } = await query;

        if (error) {
          console.error('Error fetching prospects for export:', error);
          break;
        }

        if (!rawProspects || rawProspects.length === 0) {
          hasMore = false;
        } else {
          // Decrypt phone numbers
          const decrypted = await decryptBatch(rawProspects);
          allProspects.push(...decrypted.map(mapDbProspect));
          
          if (rawProspects.length < CHUNK_SIZE) {
            hasMore = false;
          } else {
            offset += CHUNK_SIZE;
          }
        }
      }

      return allProspects;
    },
    [user, sheetId, search, decryptBatch]
  );

  // Realtime subscription for cross-tab/device sync
  useEffect(() => {
    if (!isQueryEnabled || !user) return;

    const channel = supabase
      .channel('prospects-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'prospects',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          // Invalidate cache to refetch on any external change
          queryClient.invalidateQueries({ queryKey: ['prospects', user.id] });
          queryClient.invalidateQueries({ queryKey: ['prospects-kpi', user.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isQueryEnabled, user, queryClient]);

  return {
    // Data
    prospects,
    kpiTotal, // Stable KPI count
    kpiTagCounts, // Per-tag counts for KPI display
    totalCount, // Raw total from pagination
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
    bulkDeleteProspects,
    bulkDeleteBySheet, // Delete all prospects in a sheet directly on server
    restoreProspect,
    restoreProspects,
    reorderProspects,
    importProspects,
    fetchAllForExport, // Fetch all prospects for export (bypasses pagination)

    // Cache management
    refetch,
    invalidate: () => {
      queryClient.invalidateQueries({ queryKey: ['prospects', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['prospects-kpi', user?.id] });
    },
  };
}
