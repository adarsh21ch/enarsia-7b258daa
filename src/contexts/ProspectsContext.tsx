// Global Prospects Provider - Single source of truth for instant tab switching
import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Prospect, mapOldStatusToNew } from '@/types/prospect';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useEncryption } from '@/hooks/useEncryption';

// Map database prospect to app prospect
const mapDbProspect = (dbProspect: any): Prospect => ({
  ...dbProspect,
  prospect_status: mapOldStatusToNew(dbProspect.prospect_status),
});

const PROSPECTS_CACHE_KEY = 'nevorai-prospects-cache';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

interface ProspectsContextType {
  prospects: Prospect[];
  loading: boolean;
  initialLoadDone: boolean;
  addProspect: (prospect: Partial<Prospect>) => Promise<Prospect | null>;
  updateProspect: (id: string, updates: Partial<Prospect>) => Promise<Prospect | null>;
  deleteProspect: (id: string) => Promise<boolean>;
  bulkDeleteProspects: (ids: string[]) => Promise<{ deleted: number; prospects: Prospect[] }>;
  restoreProspect: (prospect: Prospect) => Promise<Prospect | null>;
  restoreProspects: (prospects: Prospect[]) => Promise<number>;
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
          return data;
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
  
  const { encryptFields, decryptBatch, encryptBatch } = useEncryption();

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
      // Stable ordering: date_added ASC ensures row order stays fixed after tag updates
      const { data, error } = await supabase
        .from('prospects')
        .select('id, name, phone, address, age_or_dob, gender, instagram, profession, why_need, notes, funnel_stage, action_taken, prospect_status, priority, personal_tags, sheet_id, batch_date, date_added, updated_at, sort_order, funnel_stage_at, action_taken_at')
        .eq('user_id', user.id)
        .order('date_added', { ascending: true });

      if (error) {
        console.error('Error fetching prospects:', error);
        if (!initialLoadDone) toast.error('Failed to fetch prospects');
      } else {
        const decryptedData = await decryptBatch(data || []);
        setProspects(decryptedData.map(mapDbProspect));
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
    return newProspect;
  }, [user, encryptFields]);

  const updateProspect = useCallback(async (id: string, updates: Partial<Prospect>) => {
    if (!user) return null;

    // Store original for potential revert
    const originalProspect = prospects.find(p => p.id === id);
    if (!originalProspect) return null;

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
    
    return updatedProspect as Prospect;
  }, [user, encryptFields, prospects]);

  const deleteProspect = useCallback(async (id: string) => {
    const { error } = await supabase
      .from('prospects')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Failed to delete prospect');
      return false;
    }

    setProspects(prev => prev.filter(p => p.id !== id));
    return true;
  }, []);

  const bulkDeleteProspects = useCallback(async (ids: string[]) => {
    if (!user || ids.length === 0) return { deleted: 0, prospects: [] };

    const toDelete = prospects.filter(p => ids.includes(p.id));

    const { error } = await supabase
      .from('prospects')
      .delete()
      .in('id', ids);

    if (error) {
      toast.error('Failed to delete prospects');
      return { deleted: 0, prospects: [] };
    }

    setProspects(prev => prev.filter(p => !ids.includes(p.id)));
    return { deleted: toDelete.length, prospects: toDelete };
  }, [user, prospects]);

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
    return restoredProspect;
  }, [user, encryptFields]);

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
      
      // Encrypt chunk
      let encryptedChunk = chunk;
      try {
        encryptedChunk = await encryptBatch(chunk);
      } catch (err) {
        console.error('Failed to encrypt batch:', err);
      }

      // Insert chunk
      const { data, error } = await supabase
        .from('prospects')
        .insert(encryptedChunk as any)
        .select();

      if (error) {
        console.error('Failed to import chunk:', error);
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
    setProspects(prev => [...prev, ...allImported]);
    return { imported: totalImported, skipped };
  }, [user, encryptBatch]);

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
      deleteProspect,
      bulkDeleteProspects,
      restoreProspect,
      restoreProspects,
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
