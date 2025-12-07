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

export function useProspects() {
  const { user } = useAuth();
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [loading, setLoading] = useState(true);
  const hasFetched = useRef(false);
  const { encryptFields, decryptBatch, encryptBatch } = useEncryption();

  const fetchProspects = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
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
        setProspects([]);
      } else {
        // Decrypt phone numbers in batch
        const decryptedData = await decryptBatch(data || []);
        setProspects(decryptedData.map(mapDbProspect));
      }
    } catch (err) {
      console.error('Error in fetchProspects:', err);
      setProspects([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user && !hasFetched.current) {
      hasFetched.current = true;
      fetchProspects();
    } else if (!user) {
      hasFetched.current = false;
      setProspects([]);
      setLoading(false);
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
    if (updates.funnel_stage !== undefined) dbUpdates.funnel_stage = updates.funnel_stage;
    if (updates.action_taken !== undefined) dbUpdates.action_taken = updates.action_taken;
    if (updates.prospect_status !== undefined) dbUpdates.prospect_status = updates.prospect_status;
    if (updates.priority !== undefined) dbUpdates.priority = updates.priority;

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
    toast.success('Prospect deleted');
    return true;
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

  return {
    prospects,
    loading,
    addProspect,
    updateProspect,
    deleteProspect,
    importProspects,
    reorderProspects,
    refetch: fetchProspects,
  };
}
