import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { FunnelStage, FUNNEL_STAGES } from '@/types/prospect';

interface UserTarget {
  id: string;
  user_id: string;
  target_type: string;
  target_value: number;
}

// Default targets if user hasn't set any
const DEFAULT_TARGETS: Record<FunnelStage, number> = {
  'Day 1': 80,
  'Day 2': 60,
  'Day 3': 50,
  'Minimum Bill': 30,
  'Level Up': 20,
  '2CC': 10,
};

export function useUserTargets() {
  const { user } = useAuth();
  const [targets, setTargets] = useState<Record<string, number>>(DEFAULT_TARGETS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchTargets();
    }
  }, [user]);

  const fetchTargets = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_targets')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;

      // Merge fetched targets with defaults
      const mergedTargets = { ...DEFAULT_TARGETS };
      data?.forEach((target: UserTarget) => {
        if (target.target_type in mergedTargets) {
          mergedTargets[target.target_type as FunnelStage] = target.target_value;
        }
      });

      setTargets(mergedTargets);
    } catch (error) {
      console.error('Error fetching targets:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateTarget = async (targetType: string, value: number) => {
    if (!user) return;

    try {
      // Check if target exists
      const { data: existing } = await supabase
        .from('user_targets')
        .select('id')
        .eq('user_id', user.id)
        .eq('target_type', targetType)
        .maybeSingle();

      if (existing) {
        // Update existing
        const { error } = await supabase
          .from('user_targets')
          .update({ target_value: value })
          .eq('id', existing.id);

        if (error) throw error;
      } else {
        // Insert new
        const { error } = await supabase
          .from('user_targets')
          .insert({
            user_id: user.id,
            target_type: targetType,
            target_value: value,
          });

        if (error) throw error;
      }

      // Update local state
      setTargets(prev => ({ ...prev, [targetType]: value }));
      
      toast({
        title: 'Target updated',
        description: `${targetType} target set to ${value}`,
      });
    } catch (error) {
      console.error('Error updating target:', error);
      toast({
        title: 'Error',
        description: 'Failed to update target',
        variant: 'destructive',
      });
    }
  };

  return {
    targets,
    loading,
    updateTarget,
    refetch: fetchTargets,
  };
}
