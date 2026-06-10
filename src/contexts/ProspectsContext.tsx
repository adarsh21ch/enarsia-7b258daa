// Global Prospects Provider - Single source of truth for instant tab switching
import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Prospect, mapOldStatusToNew } from '@/types/prospect';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useEncryption } from '@/hooks/useEncryption';
import { encrypt as clientEncrypt, hasEncryptionKey } from '@/lib/encryption';
import { useDailyTrackingLog } from '@/hooks/useDailyTrackingLog';
import { useTrackingFormat } from '@/hooks/useTrackingFormat';
import { useAutoTrackingSync } from '@/hooks/useAutoTrackingSync';
import { logTagChange } from '@/lib/callLog';

// Map database prospect to app prospect
const mapDbProspect = (dbProspect: any): Prospect => ({
  ...dbProspect,
  prospect_status: mapOldStatusToNew(dbProspect.prospect_status),
});

// Stable ordering helper:
// - NEVER reorder based on tags/updated_at
// - Keep custom drag order if sort_order exists
// - Otherwise keep creation order (date_added) with deterministic tiebreaker (id)
const stableProspectCompare = (a: any, b: any) => {
  const aOrder = a.sort_order ?? null;
  const bOrder = b.sort_order ?? null;

  if (aOrder !== null || bOrder !== null) {
    if (aOrder === null) return 1;
    if (bOrder === null) return -1;
    if (aOrder !== bOrder) return aOrder - bOrder;
  }

  const aAdded = new Date(a.date_added).getTime();
  const bAdded = new Date(b.date_added).getTime();
  if (aAdded !== bAdded) return aAdded - bAdded;

  return String(a.id).localeCompare(String(b.id));
};

const PROSPECTS_CACHE_KEY = 'nevorai-prospects-cache';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

interface ProspectsContextType {
  prospects: Prospect[];
  loading: boolean;
  initialLoadDone: boolean;
  addProspect: (prospect: Partial<Prospect>) => Promise<Prospect | null>;
  updateProspect: (id: string, updates: Partial<Prospect>) => Promise<Prospect | null>;
  batchUpdateProspects: (updates: Array<{ id: string; changes: Partial<Prospect> }>) => Promise<boolean>;
  deleteProspect: (id: string) => Promise<Prospect | null>;  // Now returns deleted prospect for undo
  bulkDeleteProspects: (ids: string[]) => Promise<{ deleted: number; prospects: Prospect[] }>;
  restoreProspect: (prospect: Prospect) => Promise<Prospect | null>;
  restoreProspects: (prospects: Prospect[]) => Promise<number>;
  undoDelete: (id: string) => Promise<boolean>;  // Undo soft-delete
  undoBulkDelete: (ids: string[]) => Promise<boolean>;  // Undo bulk soft-delete
  importProspects: (data: Partial<Prospect>[], onProgress?: (imported: number, total: number) => void) => Promise<{ imported: number; skipped: number }>;
  reorderProspects: (ids: string[]) => Promise<boolean>;
  refetch: () => Promise<void>;
  // Optimistic update for instant UI feedback
  optimisticUpdate: (id: string, updates: Partial<Prospect>) => void;
}

const ProspectsContext = createContext<ProspectsContextType | undefined>(undefined);

export function ProspectsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [prospects, setProspects] = useState<Prospect[]>(() => {
    // Load from cache instantly for immediate display
    try {
      const cached = sessionStorage.getItem(PROSPECTS_CACHE_KEY);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        // Use cache if less than TTL old
        if (data && Array.isArray(data) && Date.now() - timestamp < CACHE_TTL) {
          return [...data].sort(stableProspectCompare);
        }
      }
    } catch (e) {
      console.error('Cache load error:', e);
    }
    return [];
  });
  const [loading, setLoading] = useState(true);
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  
  const hasFetched = useRef(false);
  const currentUserId = useRef<string | null>(null);
  const isRefreshing = useRef(false);
  
  const { encryptFields, decryptBatch } = useEncryption();
  const { logDailyTracking } = useDailyTrackingLog();
  const { leadsTrackingTagNames, stageTagNames, leadsFinalTargetTag, stageFinalTargetTag } = useTrackingFormat();
  const { triggerAutoSync } = useAutoTrackingSync();
  
  // Debounce ref to prevent multiple log writes in quick succession
  const logDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // Function to trigger daily tracking log write (debounced) + auto-sync for APPLICATION source
  const triggerDailyLog = useCallback(() => {
    if (logDebounceRef.current) {
      clearTimeout(logDebounceRef.current);
    }
    logDebounceRef.current = setTimeout(() => {
      logDailyTracking(leadsTrackingTagNames, stageTagNames, leadsFinalTargetTag, stageFinalTargetTag);
    }, 500);
    
    // Also trigger auto-sync (it internally checks if source is AUTO)
    triggerAutoSync();
  }, [logDailyTracking, leadsTrackingTagNames, stageTagNames, leadsFinalTargetTag, stageFinalTargetTag, triggerAutoSync]);

  // Save to cache on change
  useEffect(() => {
    if (user && prospects.length > 0 && initialLoadDone) {
      try {
        sessionStorage.setItem(PROSPECTS_CACHE_KEY, JSON.stringify({
          userId: user.id,
          data: prospects,
          timestamp: Date.now(),
        }));
      } catch (e) {
        // Ignore storage errors
      }
    }
  }, [prospects, user, initialLoadDone]);

  // Stable fetch function - no prospects.length dependency to avoid infinite loops
  const fetchProspects = useCallback(async (isBackground = false) => {
    if (!user) {
      setLoading(false);
      return;
    }
    
    // Prevent concurrent fetches
    if (isRefreshing.current) return;
    isRefreshing.current = true;
    
    // Only show loading on initial load (not background refresh)
    if (!isBackground && !initialLoadDone) {
      setLoading(true);
    }
    
    try {
      // Stable ordering: sort_order first, then date_added, then id for deterministic ties
      // IMPORTANT: Only fetch non-deleted prospects (deleted_at IS NULL)
      const { data, error } = await supabase
        .from('prospects')
        .select('id, name, phone, address, age_or_dob, gender, instagram, profession, why_need, notes, funnel_stage, action_taken, prospect_status, priority, personal_tags, sheet_id, batch_date, date_added, updated_at, sort_order, funnel_stage_at, action_taken_at, deleted_at')
        .eq('user_id', user.id)
        .is('deleted_at', null)  // Only fetch active (non-deleted) prospects
        .order('sort_order', { ascending: true, nullsFirst: false })
        .order('date_added', { ascending: true })
        .order('id', { ascending: true });

      if (error) {
        console.error('Error fetching prospects:', error);
        if (!initialLoadDone) toast.error('Failed to fetch prospects');
      } else {
        const decryptedData = await decryptBatch(data || []);
        const sorted = decryptedData.map(mapDbProspect).sort(stableProspectCompare);
        setProspects(sorted);
      }
    } catch (err) {
      console.error('Error in fetchProspects:', err);
    } finally {
      setLoading(false);
      setInitialLoadDone(true);
      isRefreshing.current = false;
    }
  }, [user, decryptBatch]); // Removed initialLoadDone and prospects.length to prevent infinite loops

  // Initial fetch and user change handling - run only when user changes
  useEffect(() => {
    if (!user) {
      // User logged out - clear everything
      hasFetched.current = false;
      currentUserId.current = null;
      setProspects([]);
      setLoading(false);
      setInitialLoadDone(false);
      sessionStorage.removeItem(PROSPECTS_CACHE_KEY);
      return;
    }
    
    // User changed - invalidate cache if different user
    if (currentUserId.current !== user.id) {
      currentUserId.current = user.id;
      hasFetched.current = false;
      
      try {
        const cached = sessionStorage.getItem(PROSPECTS_CACHE_KEY);
        if (cached) {
          const { userId } = JSON.parse(cached);
          if (userId !== user.id) {
            setProspects([]);
            sessionStorage.removeItem(PROSPECTS_CACHE_KEY);
          }
        }
      } catch (e) { /* ignore */ }
    }
    
    // Fetch if not already fetched for this user
    if (!hasFetched.current) {
      hasFetched.current = true;
      fetchProspects();
    }
  }, [user?.id]); // Only depend on user.id, not fetchProspects to prevent loops

  // Optimistic update - instant UI feedback
  const optimisticUpdate = useCallback((id: string, updates: Partial<Prospect>) => {
    setProspects(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
  }, []);

  const addProspect = useCallback(async (prospect: Partial<Prospect>) => {
    if (!user) return null;

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

    if (error) {
      toast.error('Failed to add prospect');
      return null;
    }

    const newProspect = mapDbProspect({ ...data, phone: prospect.phone });
    // Append to end for stable ordering
    setProspects(prev => [...prev, newProspect]);
    toast.success('Prospect added');
    
    // Trigger daily tracking log for new lead
    triggerDailyLog();
    
    return newProspect;
  }, [user, encryptFields, triggerDailyLog]);

  const updateProspect = useCallback(async (id: string, updates: Partial<Prospect>) => {
    if (!user) return null;

    // Store original for potential revert
    const originalProspect = prospects.find(p => p.id === id);
    if (!originalProspect) return null;

    const dbUpdates: Record<string, any> = {};
    
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    // ONLY encrypt if phone field is being updated (skip encryption for tag updates)
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
      return originalProspect;
    }

    // Optimistic update - update local state immediately
    const optimisticUpdates = { ...updates };
    if (updates.funnel_stage !== undefined) {
      optimisticUpdates.funnel_stage = updates.funnel_stage;
    }
    if (updates.action_taken !== undefined) {
      optimisticUpdates.action_taken = updates.action_taken;
    }
    
    setProspects(prev => prev.map(p => 
      p.id === id ? { ...p, ...optimisticUpdates } : p
    ));

    const { data, error } = await supabase
      .from('prospects')
      .update(dbUpdates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .maybeSingle();

    if (error) {
      // Revert optimistic update on error - restore original
      setProspects(prev => prev.map(p => 
        p.id === id ? originalProspect : p
      ));
      toast.error('Failed to update');
      return null;
    }

    // Update with server response (includes updated_at, etc.)
    const updatedProspect = data 
      ? mapDbProspect({ ...data, phone: updates.phone || originalProspect.phone }) 
      : { ...originalProspect, ...updates };
    
    // Update local state with server data
    setProspects(prev => prev.map(p => 
      p.id === id ? updatedProspect : p
    ));
    
    // Trigger daily tracking log if tracking fields changed
    if (updates.action_taken !== undefined || updates.funnel_stage !== undefined) {
      triggerDailyLog();
    }

    // Log discrete tag/stage changes so the Activity feed shows each event
    // (otherwise only the latest prospect state is visible).
    if (
      updates.action_taken !== undefined &&
      (updates.action_taken || '') !== (originalProspect.action_taken || '')
    ) {
      logTagChange({
        prospectId: id,
        name: originalProspect.name,
        field: 'response',
        oldValue: originalProspect.action_taken || null,
        newValue: updates.action_taken || null,
      });
    }
    if (
      updates.funnel_stage !== undefined &&
      (updates.funnel_stage || '') !== (originalProspect.funnel_stage || '')
    ) {
      logTagChange({
        prospectId: id,
        name: originalProspect.name,
        field: 'stage',
        oldValue: originalProspect.funnel_stage || null,
        newValue: updates.funnel_stage || null,
      });
    }

    return updatedProspect as Prospect;
  }, [user, encryptFields, prospects, triggerDailyLog]);

  // Batch update multiple prospects in a single operation (much faster than sequential updates)
  const batchUpdateProspects = useCallback(async (updates: Array<{ id: string; changes: Partial<Prospect> }>) => {
    if (!user || updates.length === 0) return false;

    // Store originals for potential revert
    const originals = new Map<string, Prospect>();
    updates.forEach(({ id }) => {
      const p = prospects.find(pr => pr.id === id);
      if (p) originals.set(id, p);
    });

    // Optimistic update - update all at once
    setProspects(prev => prev.map(p => {
      const update = updates.find(u => u.id === p.id);
      if (update) {
        return { ...p, ...update.changes };
      }
      return p;
    }));

    // Execute all updates in parallel (not sequential)
    const results = await Promise.all(
      updates.map(async ({ id, changes }) => {
        const dbUpdates: Record<string, any> = {};
        
        if (changes.funnel_stage !== undefined) {
          dbUpdates.funnel_stage = changes.funnel_stage;
          dbUpdates.funnel_stage_at = new Date().toISOString();
        }
        if (changes.action_taken !== undefined) {
          dbUpdates.action_taken = changes.action_taken;
          dbUpdates.action_taken_at = new Date().toISOString();
        }
        if (changes.prospect_status !== undefined) dbUpdates.prospect_status = changes.prospect_status;
        if (changes.priority !== undefined) dbUpdates.priority = changes.priority;

        if (Object.keys(dbUpdates).length === 0) return true;

        const { error } = await supabase
          .from('prospects')
          .update(dbUpdates)
          .eq('id', id)
          .eq('user_id', user.id);

        return !error;
      })
    );

    const allSuccess = results.every(r => r);
    
    if (!allSuccess) {
      // Revert optimistic updates on any failure
      setProspects(prev => prev.map(p => {
        const original = originals.get(p.id);
        return original || p;
      }));
      toast.error('Some updates failed');
      return false;
    }

    // Trigger daily tracking log if any tracking fields changed
    const hasTrackingChanges = updates.some(
      u => u.changes.action_taken !== undefined || u.changes.funnel_stage !== undefined
    );
    if (hasTrackingChanges) {
      triggerDailyLog();
    }

    return true;
  }, [user, prospects, triggerDailyLog]);

  // Soft-delete: set deleted_at + create deletion batch row
  const deleteProspect = useCallback(async (id: string): Promise<Prospect | null> => {
    if (!user) return null;
    const prospectToDelete = prospects.find(p => p.id === id);
    if (!prospectToDelete) return null;

    // Look up sheet name (best-effort)
    let sheetName: string | null = null;
    if (prospectToDelete.sheet_id) {
      const { data: sheet } = await supabase
        .from('sheets')
        .select('name')
        .eq('id', prospectToDelete.sheet_id)
        .maybeSingle();
      sheetName = sheet?.name ?? null;
    }

    const { data: batch, error: batchErr } = await supabase
      .from('deletion_batches')
      .insert({
        user_id: user.id,
        deletion_type: 'single',
        sheet_id: prospectToDelete.sheet_id ?? null,
        sheet_name: sheetName,
        lead_count: 1,
        preview_name: prospectToDelete.name,
        preview_phone: prospectToDelete.phone,
      })
      .select('id')
      .single();

    if (batchErr || !batch) {
      toast.error('Failed to delete prospect');
      return null;
    }

    const { error } = await supabase
      .from('prospects')
      .update({
        deleted_at: new Date().toISOString(),
        deletion_batch_id: batch.id,
        deletion_type: 'single',
      })
      .eq('id', id);

    if (error) {
      // best-effort rollback of batch row
      await supabase.from('deletion_batches').delete().eq('id', batch.id);
      toast.error('Failed to delete prospect');
      return null;
    }

    setProspects(prev => prev.filter(p => p.id !== id));
    triggerDailyLog();
    return prospectToDelete;
  }, [user, prospects, triggerDailyLog]);

  // Soft bulk delete: groups all leads under one batch
  const bulkDeleteProspects = useCallback(async (ids: string[]) => {
    if (!user || ids.length === 0) return { deleted: 0, prospects: [] };

    const toDelete = prospects.filter(p => ids.includes(p.id));
    if (toDelete.length === 0) return { deleted: 0, prospects: [] };

    // Pick the most common sheet for the batch label
    const sheetCounts = new Map<string, number>();
    toDelete.forEach(p => {
      if (p.sheet_id) sheetCounts.set(p.sheet_id, (sheetCounts.get(p.sheet_id) || 0) + 1);
    });
    let dominantSheetId: string | null = null;
    let max = 0;
    sheetCounts.forEach((c, sid) => { if (c > max) { max = c; dominantSheetId = sid; } });

    let sheetName: string | null = null;
    if (dominantSheetId) {
      const { data: sheet } = await supabase
        .from('sheets')
        .select('name')
        .eq('id', dominantSheetId)
        .maybeSingle();
      sheetName = sheet?.name ?? null;
    }

    const { data: batch, error: batchErr } = await supabase
      .from('deletion_batches')
      .insert({
        user_id: user.id,
        deletion_type: 'bulk',
        sheet_id: dominantSheetId,
        sheet_name: sheetName,
        lead_count: toDelete.length,
        preview_name: toDelete[0]?.name ?? null,
        preview_phone: toDelete[0]?.phone ?? null,
      })
      .select('id')
      .single();

    if (batchErr || !batch) {
      toast.error('Failed to delete prospects');
      return { deleted: 0, prospects: [] };
    }

    const { error } = await supabase
      .from('prospects')
      .update({
        deleted_at: new Date().toISOString(),
        deletion_batch_id: batch.id,
        deletion_type: 'bulk',
      })
      .in('id', ids);

    if (error) {
      await supabase.from('deletion_batches').delete().eq('id', batch.id);
      toast.error('Failed to delete prospects');
      return { deleted: 0, prospects: [] };
    }

    setProspects(prev => prev.filter(p => !ids.includes(p.id)));
    triggerDailyLog();
    return { deleted: toDelete.length, prospects: toDelete };
  }, [user, prospects, triggerDailyLog]);

  // Undo soft-delete: clear deleted_at to restore prospect
  const undoDelete = useCallback(async (id: string) => {
    const { error } = await supabase
      .from('prospects')
      .update({ deleted_at: null })
      .eq('id', id);

    if (error) {
      console.error('Failed to undo delete:', error);
      return false;
    }

    // Refetch to get the restored prospect back in the list
    await fetchProspects(true);
    return true;
  }, [fetchProspects]);

  // Undo bulk soft-delete
  const undoBulkDelete = useCallback(async (ids: string[]) => {
    if (ids.length === 0) return false;

    const { error } = await supabase
      .from('prospects')
      .update({ deleted_at: null })
      .in('id', ids);

    if (error) {
      console.error('Failed to undo bulk delete:', error);
      return false;
    }

    // Refetch to get the restored prospects back in the list
    await fetchProspects(true);
    return true;
  }, [fetchProspects]);

  const restoreProspect = useCallback(async (prospect: Prospect) => {
    if (!user) return null;

    let encryptedPhone = prospect.phone;
    try {
      const encrypted = await encryptFields({ phone: prospect.phone });
      encryptedPhone = encrypted.phone || prospect.phone;
    } catch (err) {
      console.error('Failed to encrypt phone:', err);
    }

    const { data, error } = await supabase
      .from('prospects')
      .insert({
        id: prospect.id,
        name: prospect.name,
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
        funnel_stage: prospect.funnel_stage || null,
        action_taken: prospect.action_taken || null,
        prospect_status: prospect.prospect_status || null,
        priority: prospect.priority || null,
        personal_tags: prospect.personal_tags || null,
      })
      .select()
      .single();

    if (error) {
      toast.error('Failed to restore prospect');
      return null;
    }

    const restoredProspect = mapDbProspect({ ...data, phone: prospect.phone });
    // Append to end for stable ordering
    setProspects(prev => [...prev, restoredProspect]);
    
    // Trigger daily tracking log after restore
    triggerDailyLog();
    
    return restoredProspect;
  }, [user, encryptFields, triggerDailyLog]);

  const restoreProspects = useCallback(async (prospectsToRestore: Prospect[]) => {
    if (!user || prospectsToRestore.length === 0) return 0;
    let restored = 0;
    for (const prospect of prospectsToRestore) {
      const result = await restoreProspect(prospect);
      if (result) restored++;
    }
    return restored;
  }, [user, restoreProspect]);

  const importProspects = useCallback(async (
    prospectsData: Partial<Prospect>[],
    onProgress?: (imported: number, total: number) => void
  ) => {
    if (!user) return { imported: 0, skipped: 0 };

    const validProspects = prospectsData.filter(p => p.name && p.phone);
    const skipped = prospectsData.length - validProspects.length;

    if (validProspects.length === 0) {
      return { imported: 0, skipped };
    }

    const prospectsToProcess = validProspects.map(p => ({
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

    // Process in chunks of 50 for better performance and progress feedback
    const CHUNK_SIZE = 50;
    const chunks = [];
    for (let i = 0; i < prospectsToProcess.length; i += CHUNK_SIZE) {
      chunks.push(prospectsToProcess.slice(i, i + CHUNK_SIZE));
    }

    let totalImported = 0;
    const allImported: Prospect[] = [];

    for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
      const chunk = chunks[chunkIndex];
      
      // Encrypt phone field only using client-side encryption
      const encryptedChunk = chunk.map(record => {
        const encrypted = { ...record };
        if (record.phone && hasEncryptionKey()) {
          encrypted.phone = clientEncrypt(record.phone);
        }
        return encrypted;
      });

      // Insert chunk
      const { data, error } = await supabase
        .from('prospects')
        .insert(encryptedChunk)
        .select();

      if (error) {
        console.error('Failed to import chunk:', error, 'Sample record:', JSON.stringify(encryptedChunk[0]));
        continue;
      }

      const importedWithDecryptedPhones = (data || []).map((d, i) => ({
        ...mapDbProspect(d),
        phone: chunk[i]?.phone || d.phone,
      }));
      
      allImported.push(...importedWithDecryptedPhones);
      totalImported += data?.length || 0;
      
      // Report progress
      onProgress?.(totalImported, validProspects.length);
    }
    
    // Append all imported to end for stable ordering
    if (allImported.length > 0) {
      setProspects(prev => [...prev, ...allImported]);
      // Trigger daily tracking log after import
      triggerDailyLog();
    }
    
    return { imported: totalImported, skipped };
  }, [user, triggerDailyLog]);

  const reorderProspects = useCallback(async (prospectIds: string[]) => {
    if (!user) return false;

    const updates = prospectIds.map((id, index) => ({
      id,
      sort_order: index + 1,
    }));

    try {
      for (const update of updates) {
        await supabase
          .from('prospects')
          .update({ sort_order: update.sort_order })
          .eq('id', update.id)
          .eq('user_id', user.id);
      }

      setProspects(prev => {
        const ordered = [...prev].sort((a, b) => {
          const aIdx = prospectIds.indexOf(a.id);
          const bIdx = prospectIds.indexOf(b.id);
          if (aIdx === -1 && bIdx === -1) return 0;
          if (aIdx === -1) return 1;
          if (bIdx === -1) return -1;
          return aIdx - bIdx;
        });
        return ordered;
      });
      return true;
    } catch (err) {
      console.error('Error reordering prospects:', err);
      return false;
    }
  }, [user]);

  const refetch = useCallback(() => fetchProspects(true), [fetchProspects]);

  return (
    <ProspectsContext.Provider value={{
      prospects,
      loading,
      initialLoadDone,
      addProspect,
      updateProspect,
      batchUpdateProspects,
      deleteProspect,
      bulkDeleteProspects,
      restoreProspect,
      restoreProspects,
      undoDelete,
      undoBulkDelete,
      importProspects,
      reorderProspects,
      refetch,
      optimisticUpdate,
    }}>
      {children}
    </ProspectsContext.Provider>
  );
}

export function useGlobalProspects() {
  const context = useContext(ProspectsContext);
  if (context === undefined) {
    throw new Error('useGlobalProspects must be used within a ProspectsProvider');
  }
  return context;
}
