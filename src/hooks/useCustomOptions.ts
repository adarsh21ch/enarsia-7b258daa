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
  is_filter_tag?: boolean;
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
          is_filter_tag: false,
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

  const updateOption = async (optionId: string, newValue: string) => {
    if (!user) return false;

    const trimmedValue = newValue.trim();
    if (!trimmedValue) {
      toast({ title: 'Error', description: 'Option value cannot be empty', variant: 'destructive' });
      return false;
    }

    try {
      const { error } = await supabase
        .from('custom_options')
        .update({ option_value: trimmedValue })
        .eq('id', optionId)
        .eq('user_id', user.id);

      if (error) throw error;
      
      setCustomOptions(prev => prev.map(o => 
        o.id === optionId ? { ...o, option_value: trimmedValue } : o
      ));
      toast({ title: 'Success', description: 'Option renamed' });
      return true;
    } catch (error) {
      console.error('Error updating option:', error);
      toast({ title: 'Error', description: 'Failed to rename option', variant: 'destructive' });
      return false;
    }
  };

  const updateFilterTagStatus = async (optionId: string, isFilterTag: boolean) => {
    if (!user) return false;

    try {
      // If setting a tag as filter tag, first clear all other filter tags
      if (isFilterTag) {
        const otherFilterTags = customOptions.filter(
          o => o.option_type === 'action_taken' && o.is_filter_tag && o.id !== optionId
        );
        
        // Clear other filter tags
        for (const tag of otherFilterTags) {
          await supabase
            .from('custom_options')
            .update({ is_filter_tag: false })
            .eq('id', tag.id)
            .eq('user_id', user.id);
        }
      }

      const { error } = await supabase
        .from('custom_options')
        .update({ is_filter_tag: isFilterTag })
        .eq('id', optionId)
        .eq('user_id', user.id);

      if (error) throw error;
      
      // Update local state - clear others if setting new one
      setCustomOptions(prev => prev.map(o => {
        if (o.id === optionId) {
          return { ...o, is_filter_tag: isFilterTag };
        }
        // Clear other filter tags if we're setting a new one
        if (isFilterTag && o.option_type === 'action_taken' && o.is_filter_tag) {
          return { ...o, is_filter_tag: false };
        }
        return o;
      }));
      return true;
    } catch (error) {
      console.error('Error updating filter tag status:', error);
      return false;
    }
  };

  // Set active filter tag by value (for both default and custom options)
  const setActiveFilterTag = async (tagValue: string) => {
    if (!user) return false;

    try {
      // First, clear ALL existing filter tags
      const filterTagIds = customOptions
        .filter(o => o.option_type === 'action_taken' && o.is_filter_tag)
        .map(o => o.id);
      
      for (const id of filterTagIds) {
        await supabase
          .from('custom_options')
          .update({ is_filter_tag: false })
          .eq('id', id)
          .eq('user_id', user.id);
      }

      // Check if this is a custom option
      const existingOption = customOptions.find(
        o => o.option_type === 'action_taken' && o.option_value === tagValue
      );

      if (existingOption) {
        // Update existing option
        await supabase
          .from('custom_options')
          .update({ is_filter_tag: true })
          .eq('id', existingOption.id)
          .eq('user_id', user.id);
        
        setCustomOptions(prev => prev.map(o => ({
          ...o,
          is_filter_tag: o.id === existingOption.id
        })));
      } else {
        // Create new option for default tag
        const { data, error } = await supabase
          .from('custom_options')
          .insert({
            user_id: user.id,
            option_type: 'action_taken',
            option_value: tagValue,
            is_active: true,
            is_filter_tag: true,
            sort_order: customOptions.filter(o => o.option_type === 'action_taken').length,
          })
          .select()
          .single();

        if (error) throw error;
        
        // Clear others and add new
        setCustomOptions(prev => [
          ...prev.map(o => ({
            ...o,
            is_filter_tag: o.option_type === 'action_taken' ? false : o.is_filter_tag
          })),
          data
        ]);
      }

      return true;
    } catch (error) {
      console.error('Error setting active filter tag:', error);
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

  // Get the single active filter tag (returns the tag value string or null)
  const getActiveFilterTag = (): string | null => {
    const filterTag = customOptions.find(
      o => o.option_type === 'action_taken' && o.is_filter_tag
    );
    return filterTag?.option_value || null;
  };

  // Legacy function for backwards compatibility - returns array but will only have 0 or 1 item
  const getFilterTags = () => {
    const activeTag = getActiveFilterTag();
    return activeTag ? [activeTag] : [];
  };

  const isFilterTag = (tagValue: string) => {
    return getActiveFilterTag() === tagValue;
  };

  return {
    customOptions,
    loading,
    addOption,
    deleteOption,
    updateOption,
    updateFilterTagStatus,
    setActiveFilterTag,
    getOptionsForType,
    getCustomOptionsForType,
    getActiveFilterTag,
    getFilterTags,
    isFilterTag,
    refetch: fetchOptions,
  };
}
