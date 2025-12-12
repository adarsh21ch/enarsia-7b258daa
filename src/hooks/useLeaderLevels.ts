import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface LeaderLevel {
  id: string;
  leader_id: string;
  position: number;
  code: string | null;
  label: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export function useLeaderLevels() {
  const { user } = useAuth();
  const [levels, setLevels] = useState<LeaderLevel[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLevels = useCallback(async () => {
    if (!user) {
      setLevels([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('leader_levels')
        .select('*')
        .eq('leader_id', user.id)
        .order('position', { ascending: true });

      if (error) throw error;
      setLevels((data || []) as LeaderLevel[]);
    } catch (error) {
      console.error('Error fetching levels:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchLevels();
  }, [fetchLevels]);

  const addLevel = async (label: string, code?: string) => {
    if (!user) return null;

    const nextPosition = levels.length > 0 
      ? Math.max(...levels.map(l => l.position)) + 1 
      : 1;

    const isDefault = levels.length === 0;

    try {
      const { data, error } = await supabase
        .from('leader_levels')
        .insert({
          leader_id: user.id,
          position: nextPosition,
          code: code || null,
          label: label.trim(),
          is_default: isDefault
        })
        .select()
        .single();

      if (error) throw error;
      setLevels(prev => [...prev, data as LeaderLevel]);
      toast.success('Level added');
      return data as LeaderLevel;
    } catch (error) {
      console.error('Error adding level:', error);
      toast.error('Failed to add level');
      return null;
    }
  };

  const updateLevel = async (id: string, updates: { label?: string; code?: string }) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('leader_levels')
        .update({
          label: updates.label?.trim(),
          code: updates.code || null,
        })
        .eq('id', id)
        .eq('leader_id', user.id);

      if (error) throw error;
      
      setLevels(prev => prev.map(l => 
        l.id === id ? { ...l, ...updates } : l
      ));
      toast.success('Level updated');
      return true;
    } catch (error) {
      console.error('Error updating level:', error);
      toast.error('Failed to update level');
      return false;
    }
  };

  const deleteLevel = async (id: string) => {
    if (!user) return false;

    const level = levels.find(l => l.id === id);
    if (level?.is_default) {
      toast.error('Cannot delete the default level');
      return false;
    }

    try {
      const { error } = await supabase
        .from('leader_levels')
        .delete()
        .eq('id', id)
        .eq('leader_id', user.id);

      if (error) throw error;
      
      setLevels(prev => prev.filter(l => l.id !== id));
      toast.success('Level deleted');
      return true;
    } catch (error) {
      console.error('Error deleting level:', error);
      toast.error('Failed to delete level');
      return false;
    }
  };

  const setDefaultLevel = async (id: string) => {
    if (!user) return false;

    try {
      // First, clear all defaults
      await supabase
        .from('leader_levels')
        .update({ is_default: false })
        .eq('leader_id', user.id);

      // Set new default
      const { error } = await supabase
        .from('leader_levels')
        .update({ is_default: true })
        .eq('id', id)
        .eq('leader_id', user.id);

      if (error) throw error;
      
      setLevels(prev => prev.map(l => ({
        ...l,
        is_default: l.id === id
      })));
      toast.success('Default level updated');
      return true;
    } catch (error) {
      console.error('Error setting default level:', error);
      toast.error('Failed to set default level');
      return false;
    }
  };

  const reorderLevels = async (reorderedLevels: LeaderLevel[]) => {
    if (!user) return false;

    try {
      // Update positions in database
      for (let i = 0; i < reorderedLevels.length; i++) {
        await supabase
          .from('leader_levels')
          .update({ position: i + 1 })
          .eq('id', reorderedLevels[i].id)
          .eq('leader_id', user.id);
      }
      
      setLevels(reorderedLevels.map((l, i) => ({ ...l, position: i + 1 })));
      return true;
    } catch (error) {
      console.error('Error reordering levels:', error);
      toast.error('Failed to reorder levels');
      return false;
    }
  };

  return {
    levels,
    loading,
    addLevel,
    updateLevel,
    deleteLevel,
    setDefaultLevel,
    reorderLevels,
    refetch: fetchLevels
  };
}

// Hook for fetching levels of a specific leader (for member dropdowns)
export function useLeaderLevelsForMember(leaderUserId: string | null) {
  const [levels, setLevels] = useState<LeaderLevel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLevels = async () => {
      if (!leaderUserId) {
        setLevels([]);
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('leader_levels')
          .select('*')
          .eq('leader_id', leaderUserId)
          .order('position', { ascending: true });

        if (error) throw error;
        setLevels((data || []) as LeaderLevel[]);
      } catch (error) {
        console.error('Error fetching leader levels:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchLevels();
  }, [leaderUserId]);

  return { levels, loading };
}
