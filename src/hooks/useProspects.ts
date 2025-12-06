import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Prospect, mapOldStatusToNew } from '@/types/prospect';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

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
        .order('date_added', { ascending: false });

      if (error) {
        toast.error('Failed to fetch prospects');
        console.error('Error fetching prospects:', error);
        setProspects([]);
      } else {
        setProspects((data || []).map(mapDbProspect));
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

    const { data, error } = await supabase
      .from('prospects')
      .insert({
        name: prospect.name!,
        phone: prospect.phone!,
        user_id: user.id,
        city: prospect.city || null,
        state: prospect.state || null,
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

    const newProspect = mapDbProspect(data);
    setProspects(prev => [newProspect, ...prev]);
    toast.success('Prospect added');
    return newProspect;
  };

  const updateProspect = async (id: string, updates: Partial<Prospect>) => {
    // Only send fields that exist in the database
    const dbUpdates: Record<string, any> = {};
    
    // Map frontend fields to database fields
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.phone !== undefined) dbUpdates.phone = updates.phone;
    if (updates.city !== undefined) dbUpdates.city = updates.city;
    if (updates.state !== undefined) dbUpdates.state = updates.state;
    if ((updates as any).age_or_dob !== undefined) dbUpdates.age_or_dob = (updates as any).age_or_dob;
    if ((updates as any).gender !== undefined) dbUpdates.gender = (updates as any).gender;
    if ((updates as any).instagram !== undefined) dbUpdates.instagram = (updates as any).instagram;
    if ((updates as any).profession !== undefined) dbUpdates.profession = (updates as any).profession;
    if (updates.sheet_id !== undefined) dbUpdates.sheet_id = updates.sheet_id;
    if (updates.batch_date !== undefined) dbUpdates.batch_date = updates.batch_date;
    
    // Note: These fields are in the Prospect type but may not be in DB
    // We'll try to update them but they may be ignored by DB if not present
    
    const { data, error } = await supabase
      .from('prospects')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      toast.error('Failed to update prospect');
      console.error('Error updating prospect:', error);
      return null;
    }

    const updatedProspect = mapDbProspect(data);
    setProspects(prev => prev.map(p => p.id === id ? updatedProspect : p));
    toast.success('Prospect updated');
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

    const prospectsToInsert = validProspects.map(p => ({
      user_id: user.id,
      name: p.name!,
      phone: p.phone!,
      city: p.city || null,
      state: p.state || null,
      age_or_dob: (p as any).age_or_dob || null,
      gender: (p as any).gender || null,
      instagram: (p as any).instagram || null,
      profession: (p as any).profession || null,
      sheet_id: p.sheet_id || null,
      batch_date: p.batch_date || new Date().toISOString().split('T')[0],
    }));

    const { data, error } = await supabase
      .from('prospects')
      .insert(prospectsToInsert as any)
      .select();

    if (error) {
      toast.error('Failed to import prospects');
      console.error('Error importing prospects:', error);
      return { imported: 0, skipped: prospectsData.length };
    }

    setProspects(prev => [...(data || []).map(mapDbProspect), ...prev]);
    return { imported: data?.length || 0, skipped };
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
