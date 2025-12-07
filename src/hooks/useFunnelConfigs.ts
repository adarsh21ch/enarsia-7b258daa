import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface FunnelConfig {
  id: string;
  user_id: string;
  funnel_name: string;
  funnel_length: number;
  day_1_start: string;
  created_at: string;
  updated_at: string;
}

export function useFunnelConfigs() {
  const { user } = useAuth();
  const [configs, setConfigs] = useState<FunnelConfig[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchConfigs = useCallback(async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('funnel_configs')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setConfigs(data || []);
    } catch (error) {
      console.error('Error fetching funnel configs:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchConfigs();
  }, [fetchConfigs]);

  const addConfig = async (name: string, length: number, startDate: string) => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('funnel_configs')
        .insert({
          user_id: user.id,
          funnel_name: name,
          funnel_length: length,
          day_1_start: startDate,
        })
        .select()
        .single();

      if (error) throw error;
      setConfigs(prev => [...prev, data]);
      toast.success('Funnel added successfully');
      return data;
    } catch (error) {
      console.error('Error adding funnel config:', error);
      toast.error('Failed to add funnel');
      return null;
    }
  };

  const updateConfig = async (id: string, updates: Partial<Pick<FunnelConfig, 'funnel_name' | 'funnel_length' | 'day_1_start'>>) => {
    try {
      const { error } = await supabase
        .from('funnel_configs')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
      setConfigs(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
      toast.success('Funnel updated');
    } catch (error) {
      console.error('Error updating funnel config:', error);
      toast.error('Failed to update funnel');
    }
  };

  const deleteConfig = async (id: string) => {
    try {
      const { error } = await supabase
        .from('funnel_configs')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setConfigs(prev => prev.filter(c => c.id !== id));
      toast.success('Funnel deleted');
    } catch (error) {
      console.error('Error deleting funnel config:', error);
      toast.error('Failed to delete funnel');
    }
  };

  // Get valid stages based on funnel length
  const getValidStages = (length: number) => {
    const allStages = ['day_1', 'day_2', 'day_3', 'day_4', 'day_5', 'minimum_bill', 'level_up', 'two_cc'];
    const dayStages = allStages.slice(0, length); // Get Day 1 to Day N
    return [...dayStages, 'minimum_bill', 'level_up', 'two_cc'];
  };

  // Calculate which cycle a date falls into
  const getCycleForDate = (config: FunnelConfig, date: Date) => {
    const startDate = new Date(config.day_1_start);
    const diffDays = Math.floor((date.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return null;
    return Math.floor(diffDays / config.funnel_length) + 1;
  };

  return {
    configs,
    loading,
    addConfig,
    updateConfig,
    deleteConfig,
    getValidStages,
    getCycleForDate,
    refetch: fetchConfigs,
  };
}
