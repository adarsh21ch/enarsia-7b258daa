import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type TrackingSource = 'MANUAL' | 'AUTO' | 'HYBRID';

export interface TrackingSourcePreferences {
  id: string;
  user_id: string;
  personal_source: TrackingSource;
  team_source: TrackingSource;
  created_at: string;
  updated_at: string;
}

export interface UpdatePreferencesInput {
  personal_source?: TrackingSource;
  team_source?: TrackingSource;
}

export function useTrackingSourcePreferences() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch preferences for the current user
  const {
    data: preferences,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['tracking_source_preferences', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from('tracking_source_preferences')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      return data as TrackingSourcePreferences | null;
    },
    enabled: !!user?.id,
  });

  // Upsert mutation (create or update)
  const upsertMutation = useMutation({
    mutationFn: async (input: UpdatePreferencesInput) => {
      if (!user?.id) throw new Error('User not authenticated');

      const updateData = {
        user_id: user.id,
        ...(input.personal_source !== undefined && { personal_source: input.personal_source }),
        ...(input.team_source !== undefined && { team_source: input.team_source }),
      };

      const { data, error } = await supabase
        .from('tracking_source_preferences')
        .upsert(updateData, { onConflict: 'user_id' })
        .select()
        .single();

      if (error) throw error;
      return data as TrackingSourcePreferences;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['tracking_source_preferences', user?.id], data);
    },
  });

  // Set personal source preference
  const setPersonalSource = useCallback(async (source: TrackingSource) => {
    return upsertMutation.mutateAsync({ personal_source: source });
  }, [upsertMutation]);

  // Set team source preference
  const setTeamSource = useCallback(async (source: TrackingSource) => {
    return upsertMutation.mutateAsync({ team_source: source });
  }, [upsertMutation]);

  // Set both preferences at once
  const setPreferences = useCallback(async (input: UpdatePreferencesInput) => {
    return upsertMutation.mutateAsync(input);
  }, [upsertMutation]);

  // Get current personal source (with default fallback)
  const getPersonalSource = useCallback((): TrackingSource => {
    return preferences?.personal_source || 'MANUAL';
  }, [preferences]);

  // Get current team source (with default fallback)
  const getTeamSource = useCallback((): TrackingSource => {
    return preferences?.team_source || 'MANUAL';
  }, [preferences]);

  return {
    // Data
    preferences,
    isLoading,
    error,
    
    // Getters with defaults
    personalSource: getPersonalSource(),
    teamSource: getTeamSource(),
    getPersonalSource,
    getTeamSource,
    
    // Setters
    setPersonalSource,
    setTeamSource,
    setPreferences,
    
    // State
    isUpdating: upsertMutation.isPending,
    refetch,
  };
}
