import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Prospect } from '@/types/prospect';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

// Encryption functions defined outside to avoid hook dependency issues
async function encryptFieldsCall(data: { phone?: string; email?: string }) {
  try {
    const { data: result, error } = await supabase.functions.invoke('encrypt-data', {
      body: { action: 'encrypt', data }
    });
    if (error) {
      console.error('Encryption error:', error);
      return data;
    }
    return result.encrypted;
  } catch (err) {
    console.error('Encryption failed:', err);
    return data;
  }
}

async function decryptBatchCall(records: Prospect[]): Promise<Prospect[]> {
  if (records.length === 0) return records;
  try {
    const { data: result, error } = await supabase.functions.invoke('encrypt-data', {
      body: { action: 'decrypt-batch', data: { records } }
    });
    if (error) {
      console.error('Batch decryption error:', error);
      return records;
    }
    return result.decrypted;
  } catch (err) {
    console.error('Batch decryption failed:', err);
    return records;
  }
}

export function useProspects() {
  const { user } = useAuth();
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [loading, setLoading] = useState(true);
  const hasFetched = useRef(false);

  const fetchProspects = useCallback(async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('prospects')
        .select('*')
        .eq('user_id', user.id)
        .order('date_added', { ascending: false });

      if (error) {
        toast.error('Failed to fetch prospects');
        console.error('Error fetching prospects:', error);
        setProspects([]);
      } else {
        const decryptedData = await decryptBatchCall(data as Prospect[]);
        setProspects(decryptedData);
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

    const encrypted = await encryptFieldsCall({
      phone: prospect.phone,
      email: prospect.email || undefined
    });

    const { data, error } = await supabase
      .from('prospects')
      .insert({
        name: prospect.name!,
        phone: encrypted.phone || prospect.phone!,
        email: encrypted.email || prospect.email || null,
        notes: prospect.notes || null,
        user_id: user.id,
        funnel_stage: prospect.funnel_stage || null,
        priority: prospect.priority || null,
        sheet_id: prospect.sheet_id || null,
        batch_date: prospect.batch_date || new Date().toISOString().split('T')[0],
        enrollment_status: (prospect.enrollment_status || 'Not Enrolled') as any,
      })
      .select()
      .single();

    if (error) {
      toast.error('Failed to add prospect');
      console.error('Error adding prospect:', error);
      return null;
    }

    const decryptedProspect = {
      ...data,
      phone: prospect.phone!,
      email: prospect.email || null
    } as Prospect;
    
    setProspects(prev => [decryptedProspect, ...prev]);
    toast.success('Prospect added');
    return decryptedProspect;
  };

  const updateProspect = async (id: string, updates: Partial<Prospect>) => {
    let encryptedUpdates = { ...updates };
    
    if (updates.phone || updates.email) {
      const encrypted = await encryptFieldsCall({
        phone: updates.phone,
        email: updates.email || undefined
      });
      
      if (updates.phone) encryptedUpdates.phone = encrypted.phone;
      if (updates.email) encryptedUpdates.email = encrypted.email;
    }

    const { data, error } = await supabase
      .from('prospects')
      .update(encryptedUpdates as any)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      toast.error('Failed to update prospect');
      console.error('Error updating prospect:', error);
      return null;
    }

    const decryptedUpdate = {
      ...data,
      phone: updates.phone || (data as Prospect).phone,
      email: updates.email !== undefined ? updates.email : (data as Prospect).email
    } as Prospect;
    
    setProspects(prev => prev.map(p => p.id === id ? decryptedUpdate : p));
    return decryptedUpdate;
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

    const prospectsToInsert = await Promise.all(
      validProspects.map(async (p) => {
        const encrypted = await encryptFieldsCall({
          phone: p.phone,
          email: p.email || undefined
        });
        
        return {
          user_id: user.id,
          name: p.name!,
          phone: encrypted.phone || p.phone!,
          email: encrypted.email || p.email || null,
          notes: p.notes || null,
          funnel_stage: p.funnel_stage || null,
          action_taken: p.action_taken || null,
          prospect_status: p.prospect_status || null,
          priority: p.priority || null,
          last_contact_date: p.last_contact_date || null,
          sheet_id: p.sheet_id || null,
          batch_date: p.batch_date || new Date().toISOString().split('T')[0],
          enrollment_status: (p.enrollment_status || 'Not Enrolled') as any,
        };
      })
    );

    const { data, error } = await supabase
      .from('prospects')
      .insert(prospectsToInsert)
      .select();

    if (error) {
      toast.error('Failed to import prospects');
      console.error('Error importing prospects:', error);
      return { imported: 0, skipped: prospectsData.length };
    }

    const decryptedData = await decryptBatchCall(data as Prospect[]);
    setProspects(prev => [...decryptedData, ...prev]);
    return { imported: data.length, skipped };
  };

  return {
    prospects,
    loading,
    addProspect,
    updateProspect,
    deleteProspect,
    importProspects,
    refetch: fetchProspects,
  };
}
