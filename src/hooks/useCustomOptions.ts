import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

export interface CustomOption {
  id: string;
  user_id: string;
  option_type: string;
  option_value: string;
  is_active: boolean;
  sort_order: number | null;
  created_at: string;
}

export type OptionType = 'funnel_stage' | 'action_taken' | 'prospect_status' | 'priority';

export function useCustomOptions() {
  const { user } = useAuth();
  const [customOptions, setCustomOptions] = useState<CustomOption[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOptions = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('custom_options')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      setCustomOptions(data || []);
    } catch (error) {
      console.error('Error fetching custom options:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOptions();
  }, [user]);

  const addOption = async (optionType: OptionType, optionValue: string) => {
    if (!user) return null;
    
    const trimmedValue = optionValue.trim();
    if (!trimmedValue) {
      toast({ title: 'Error', description: 'Option value cannot be empty', variant: 'destructive' });
      return null;
    }

    // Check if option already exists
    const exists = customOptions.some(
      opt => opt.option_type === optionType && opt.option_value.toLowerCase() === trimmedValue.toLowerCase()
    );
    if (exists) {
      toast({ title: 'Error', description: 'This option already exists', variant: 'destructive' });
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('custom_options')
        .insert({
          user_id: user.id,
          option_type: optionType,
          option_value: trimmedValue,
          is_active: true,
          sort_order: customOptions.filter(o => o.option_type === optionType).length,
        })
        .select()
        .single();

      if (error) throw error;
      
      setCustomOptions(prev => [...prev, data]);
      toast({ title: 'Success', description: `Added "${trimmedValue}"` });
      return data;
    } catch (error) {
      console.error('Error adding option:', error);
      toast({ title: 'Error', description: 'Failed to add option', variant: 'destructive' });
      return null;
    }
  };

  const deleteOption = async (optionId: string) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('custom_options')
        .delete()
        .eq('id', optionId)
        .eq('user_id', user.id);

      if (error) throw error;
      
      setCustomOptions(prev => prev.filter(o => o.id !== optionId));
      toast({ title: 'Success', description: 'Option deleted' });
      return true;
    } catch (error) {
      console.error('Error deleting option:', error);
      toast({ title: 'Error', description: 'Failed to delete option', variant: 'destructive' });
      return false;
    }
  };

  const getOptionsForType = (optionType: OptionType, defaultOptions: readonly string[]) => {
    const custom = customOptions
      .filter(o => o.option_type === optionType)
      .map(o => o.option_value);
    
    // Combine default and custom, removing duplicates
    const combined = [...defaultOptions];
    custom.forEach(c => {
      if (!combined.includes(c)) {
        combined.push(c);
      }
    });
    
    return combined;
  };

  const getCustomOptionsForType = (optionType: OptionType) => {
    return customOptions.filter(o => o.option_type === optionType);
  };

  return {
    customOptions,
    loading,
    addOption,
    deleteOption,
    getOptionsForType,
    getCustomOptionsForType,
    refetch: fetchOptions,
  };
}
