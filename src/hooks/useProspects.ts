import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Prospect } from '@/types/prospect';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export function useProspects() {
  const { user } = useAuth();
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProspects = useCallback(async () => {
    if (!user) return;
    
    setLoading(true);
    const { data, error } = await supabase
      .from('prospects')
      .select('*')
      .eq('user_id', user.id)
      .order('date_added', { ascending: false });

    if (error) {
      toast.error('Failed to fetch prospects');
      console.error('Error fetching prospects:', error);
    } else {
      setProspects(data as Prospect[]);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchProspects();
  }, [fetchProspects]);

  const addProspect = async (prospect: Partial<Prospect>) => {
    if (!user) return null;

    const { data, error } = await supabase
      .from('prospects')
      .insert({
        name: prospect.name!,
        phone: prospect.phone!,
        email: prospect.email || null,
        notes: prospect.notes || null,
        user_id: user.id,
        funnel_stage: (prospect.funnel_stage || 'Enrollment') as any,
        priority: (prospect.priority || 'Medium') as any,
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

    setProspects(prev => [data as Prospect, ...prev]);
    toast.success('Prospect added');
    return data as Prospect;
  };

  const updateProspect = async (id: string, updates: Partial<Prospect>) => {
    const { data, error } = await supabase
      .from('prospects')
      .update(updates as any)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      toast.error('Failed to update prospect');
      console.error('Error updating prospect:', error);
      return null;
    }

    setProspects(prev => prev.map(p => p.id === id ? (data as Prospect) : p));
    return data as Prospect;
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

    const prospectsToInsert = validProspects.map(p => ({
      user_id: user.id,
      name: p.name!,
      phone: p.phone!,
      email: p.email || null,
      notes: p.notes || null,
      funnel_stage: (p.funnel_stage || 'Enrollment') as any,
      action_taken: p.action_taken || null,
      prospect_status: p.prospect_status || null,
      priority: (p.priority || 'Medium') as any,
      last_contact_date: p.last_contact_date || null,
      sheet_id: p.sheet_id || null,
      batch_date: p.batch_date || new Date().toISOString().split('T')[0],
      enrollment_status: (p.enrollment_status || 'Not Enrolled') as any,
    }));

    const { data, error } = await supabase
      .from('prospects')
      .insert(prospectsToInsert)
      .select();

    if (error) {
      toast.error('Failed to import prospects');
      console.error('Error importing prospects:', error);
      return { imported: 0, skipped: prospectsData.length };
    }

    setProspects(prev => [...(data as Prospect[]), ...prev]);
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
