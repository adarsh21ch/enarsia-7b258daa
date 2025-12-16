import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Prospect, mapOldStatusToNew } from '@/types/prospect';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useEncryption } from '@/hooks/useEncryption';

// Map database prospect to app prospect (handles status mapping)
const mapDbProspect = (dbProspect: any): Prospect => ({
  ...dbProspect,
  prospect_status: mapOldStatusToNew(dbProspect.prospect_status),
});

// Session storage key for caching prospects
const PROSPECTS_CACHE_KEY = 'nevorai-prospects-cache';

export function useProspects() {
  const { user } = useAuth();
  const [prospects, setProspects] = useState<Prospect[]>(() => {
    // Try to load from sessionStorage immediately for instant UI
    try {
      const cached = sessionStorage.getItem(PROSPECTS_CACHE_KEY);
      if (cached) {
        const { userId, data } = JSON.parse(cached);
        // Only use cache if it's for the same user (we'll verify this in useEffect)
        if (data && Array.isArray(data)) {
          return data;
        }
      }
    } catch (e) {
      console.error('Error loading cached prospects:', e);
    }
    return [];
  });
  const [loading, setLoading] = useState(true);
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  const hasFetched = useRef(false);
  const currentUserId = useRef<string | null>(null);
  const { encryptFields, decryptBatch, encryptBatch } = useEncryption();

  // Save to cache whenever prospects change
  useEffect(() => {
    if (user && prospects.length > 0) {
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
  }, [prospects, user]);

  const fetchProspects = useCallback(async (isRefresh = false) => {
    if (!user) {
      setLoading(false);
      return;
    }
    
    // Only show loading on initial load, not on refreshes if we have data
    if (!initialLoadDone || isRefresh) {
      setLoading(prospects.length === 0);
    }
    
    try {
      const { data, error } = await supabase
        .from('prospects')
        .select('*')
        .eq('user_id', user.id)
        .order('sort_order', { ascending: true, nullsFirst: false })
        .order('date_added', { ascending: false });

      if (error) {
        toast.error('Failed to fetch prospects');
        console.error('Error fetching prospects:', error);
        if (!initialLoadDone) setProspects([]);
      } else {
        // Decrypt phone numbers in batch
        const decryptedData = await decryptBatch(data || []);
        setProspects(decryptedData.map(mapDbProspect));
      }
    } catch (err) {
      console.error('Error in fetchProspects:', err);
      if (!initialLoadDone) setProspects([]);
    } finally {
      setLoading(false);
      setInitialLoadDone(true);
    }
  }, [user, initialLoadDone, prospects.length, decryptBatch]);

  useEffect(() => {
    // Check if user changed
    if (user && currentUserId.current !== user.id) {
      // User changed - clear cache and refetch
      currentUserId.current = user.id;
      hasFetched.current = false;
      
      // Check if cached data is for current user
      try {
        const cached = sessionStorage.getItem(PROSPECTS_CACHE_KEY);
        if (cached) {
          const { userId } = JSON.parse(cached);
          if (userId !== user.id) {
            // Cache is for different user, clear it
            setProspects([]);
            sessionStorage.removeItem(PROSPECTS_CACHE_KEY);
          }
        }
      } catch (e) {
        // Ignore
      }
    }
    
    if (user && !hasFetched.current) {
      hasFetched.current = true;
      fetchProspects();
    } else if (!user) {
      hasFetched.current = false;
      currentUserId.current = null;
      setProspects([]);
      setLoading(false);
      setInitialLoadDone(false);
      sessionStorage.removeItem(PROSPECTS_CACHE_KEY);
    }
  }, [user, fetchProspects]);

  const addProspect = async (prospect: Partial<Prospect>) => {
    if (!user) return null;

    // Encrypt phone number before storing
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
      console.error('Error adding prospect:', error);
      return null;
    }

    // Store with decrypted phone for display
    const newProspect = mapDbProspect({ ...data, phone: prospect.phone });
    setProspects(prev => [newProspect, ...prev]);
    toast.success('Prospect added');
    return newProspect;
  };

  const updateProspect = async (id: string, updates: Partial<Prospect>) => {
    if (!user) return null;

    // Build database updates object with all valid fields
    const dbUpdates: Record<string, any> = {};
    
    // Map all database-compatible fields
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.phone !== undefined) {
      // Encrypt phone number before updating
      try {
        const encrypted = await encryptFields({ phone: updates.phone });
        dbUpdates.phone = encrypted.phone || updates.phone;
      } catch (err) {
        console.error('Failed to encrypt phone:', err);
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
    
    // Also save funnel_stage, action_taken, prospect_status, priority to database
    // Track timestamp changes for 5-minute protection
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

    // If no database fields to update, just return
    if (Object.keys(dbUpdates).length === 0) {
      return prospects.find(p => p.id === id) || null;
    }

    const { data, error } = await supabase
      .from('prospects')
      .update(dbUpdates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .maybeSingle();

    if (error) {
      toast.error('Failed to update prospect');
      console.error('Error updating prospect:', error);
      return null;
    }

    // Update local state with decrypted phone for display
    const updatedProspect = data ? mapDbProspect({ ...data, phone: updates.phone || prospects.find(p => p.id === id)?.phone }) : { ...prospects.find(p => p.id === id), ...updates };
    setProspects(prev => prev.map(p => p.id === id ? { ...p, ...updatedProspect } : p));
    toast.success('Updated');
    return updatedProspect;
  };

  const deleteProspect = async (id: string) => {
    const { error } = await supabase
      .from('prospects')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Failed to delete prospect');
      console.error('Error deleting prospect:', error);
      return false;
    }

    setProspects(prev => prev.filter(p => p.id !== id));
    return true;
  };

  const bulkDeleteProspects = async (ids: string[]) => {
    if (!user || ids.length === 0) return { deleted: 0, prospects: [] };

    const toDelete = prospects.filter(p => ids.includes(p.id));

    const { error } = await supabase
      .from('prospects')
      .delete()
      .in('id', ids);

    if (error) {
      toast.error('Failed to delete prospects');
      console.error('Error deleting prospects:', error);
      return { deleted: 0, prospects: [] };
    }

    setProspects(prev => prev.filter(p => !ids.includes(p.id)));
    return { deleted: toDelete.length, prospects: toDelete };
  };

  const restoreProspect = async (prospect: Prospect) => {
    if (!user) return null;

    // Encrypt phone number before storing
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
      console.error('Error restoring prospect:', error);
      return null;
    }

    const restoredProspect = mapDbProspect({ ...data, phone: prospect.phone });
    setProspects(prev => [restoredProspect, ...prev]);
    return restoredProspect;
  };

  const restoreProspects = async (prospectsToRestore: Prospect[]) => {
    if (!user || prospectsToRestore.length === 0) return 0;

    let restored = 0;
    for (const prospect of prospectsToRestore) {
      const result = await restoreProspect(prospect);
      if (result) restored++;
    }
    return restored;
  };

  const importProspects = async (prospectsData: Partial<Prospect>[]) => {
    if (!user) return { imported: 0, skipped: 0 };

    const validProspects = prospectsData.filter(p => p.name && p.phone);
    const skipped = prospectsData.length - validProspects.length;

    if (validProspects.length === 0) {
      return { imported: 0, skipped };
    }

    // Prepare prospects for encryption
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

    // Encrypt phone numbers in batch
    let encryptedProspects = prospectsToProcess;
    try {
      encryptedProspects = await encryptBatch(prospectsToProcess);
    } catch (err) {
      console.error('Failed to encrypt batch:', err);
    }

    const { data, error } = await supabase
      .from('prospects')
      .insert(encryptedProspects as any)
      .select();

    if (error) {
      toast.error('Failed to import prospects');
      console.error('Error importing prospects:', error);
      return { imported: 0, skipped: prospectsData.length };
    }

    // Store with original (decrypted) phone numbers for display
    const importedWithDecryptedPhones = (data || []).map((d, i) => ({
      ...mapDbProspect(d),
      phone: prospectsToProcess[i]?.phone || d.phone,
    }));
    
    setProspects(prev => [...importedWithDecryptedPhones, ...prev]);
    return { imported: data?.length || 0, skipped };
  };

  const reorderProspects = async (prospectIds: string[]) => {
    if (!user) return false;

    // Update sort_order for each prospect
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

      // Update local state to reflect new order
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
  };

  // Refresh function that forces re-fetch
  const refetch = useCallback(() => fetchProspects(true), [fetchProspects]);

  return {
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
  };
}
