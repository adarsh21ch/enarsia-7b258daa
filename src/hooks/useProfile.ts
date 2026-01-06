import { useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useEncryption } from '@/hooks/useEncryption';

export interface Profile {
  id: string;
  user_id: string;
  display_name: string | null;
  phone: string | null;
  company_name: string | null;
  city: string | null;
  bio: string | null;
  avatar_url: string | null;
  leader_id: string | null; // Canonical field
  neverai_id: string | null; // DEPRECATED - use leader_id
  leader_code_seq: number | null;
  level_id: string | null;
  created_at: string;
  updated_at: string;
  leaders_id_of_my_leader: string | null;
  root_leader_id: string | null;
  allow_leader_to_view: boolean;
  leader_prompt_completed: boolean;
  use_leader_stages: boolean;
  stage_count: number;
  stage_labels: string[];
  response_labels: string[];
}

export interface ProfileUpdate {
  display_name?: string | null;
  phone?: string | null;
  company_name?: string | null;
  city?: string | null;
  bio?: string | null;
  avatar_url?: string | null;
  leaders_id_of_my_leader?: string | null;
  root_leader_id?: string | null;
  allow_leader_to_view?: boolean;
  leader_prompt_completed?: boolean;
  use_leader_stages?: boolean;
  stage_count?: number;
  stage_labels?: string[];
  response_labels?: string[];
}

export function useProfile() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { encryptFields, decryptFields } = useEncryption();
  const queryClient = useQueryClient();

  const queryKey = ['profile', user?.id];

  // Fetch profile with React Query
  const { data: profile, isLoading: loading, refetch } = useQuery({
    queryKey,
    queryFn: async (): Promise<Profile | null> => {
      if (!user) return null;

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching profile:', error);
        throw error;
      }

      if (!data) {
        // Create profile if doesn't exist
        const { data: newProfile, error: insertError } = await supabase
          .from('profiles')
          .insert({ user_id: user.id })
          .select()
          .single();

        if (insertError) {
          console.error('Error creating profile:', insertError);
          throw insertError;
        }

        const p = newProfile as any;
        return {
          ...newProfile,
          leader_id: p.leader_id || p.neverai_id || null,
          stage_labels: newProfile.stage_labels || [],
          response_labels: newProfile.response_labels || [],
        } as Profile;
      }

      // Decrypt phone if exists
      if (data.phone) {
        try {
          const decrypted = await decryptFields({ phone: data.phone });
          data.phone = decrypted.phone || data.phone;
        } catch {
          // Legacy unencrypted data
        }
      }

      const p = data as any;
      return {
        ...data,
        leader_id: p.leader_id || p.neverai_id || null,
        stage_labels: data.stage_labels || [],
        response_labels: data.response_labels || [],
      } as Profile;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (updates: ProfileUpdate) => {
      if (!user) throw new Error('No user');

      // Encrypt phone if provided
      let encryptedUpdates = { ...updates };
      if (updates.phone) {
        try {
          const encrypted = await encryptFields({ phone: updates.phone });
          encryptedUpdates.phone = encrypted.phone || updates.phone;
        } catch {
          // Continue unencrypted
        }
      }

      // Ensure profile exists
      const { data: existing } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!existing) {
        await supabase.from('profiles').insert({ user_id: user.id });
      }

      const { error } = await supabase
        .from('profiles')
        .update(encryptedUpdates as any)
        .eq('user_id', user.id);

      if (error) throw error;
      return updates;
    },
    onMutate: async (updates) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<Profile>(queryKey);
      
      if (previous) {
        queryClient.setQueryData<Profile>(queryKey, { ...previous, ...updates });
      }
      
      return { previous };
    },
    onError: (err, _, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
      }
      toast({ title: 'Error updating profile', variant: 'destructive' });
    },
    onSuccess: () => {
      toast({ title: 'Profile updated successfully' });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  // Leader hierarchy mutation
  const leaderMutation = useMutation({
    mutationFn: async (leaderId: string) => {
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase.rpc('update_leader_hierarchy', {
        p_user_id: user.id,
        p_leader_id: leaderId
      });

      if (error) throw error;

      const result = data as { success: boolean; error?: string; leaders_id_of_my_leader?: string; root_leader_id?: string };
      if (!result.success) throw new Error(result.error || 'Failed to update leader');
      
      return result;
    },
    onSuccess: (result) => {
      queryClient.setQueryData<Profile>(queryKey, (prev) => prev ? {
        ...prev,
        leaders_id_of_my_leader: result.leaders_id_of_my_leader || null,
        root_leader_id: result.root_leader_id || null
      } : prev);
      toast({ title: 'Leader updated successfully' });
    },
    onError: () => {
      toast({ title: 'Error updating leader', variant: 'destructive' });
    },
  });

  // Clear leader mutation
  const clearLeaderMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('profiles')
        .update({ leaders_id_of_my_leader: null, root_leader_id: null })
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.setQueryData<Profile>(queryKey, (prev) => prev ? {
        ...prev,
        leaders_id_of_my_leader: null,
        root_leader_id: null
      } : prev);
      toast({ title: 'Leader cleared successfully' });
    },
    onError: () => {
      toast({ title: 'Error clearing leader', variant: 'destructive' });
    },
  });

  const updateProfile = useCallback(async (updates: ProfileUpdate) => {
    try {
      await updateMutation.mutateAsync(updates);
      return { error: null };
    } catch (error) {
      return { error };
    }
  }, [updateMutation]);

  const updateLeaderHierarchy = useCallback(async (leaderNeveraiId: string) => {
    try {
      await leaderMutation.mutateAsync(leaderNeveraiId);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }, [leaderMutation]);

  const clearLeaderHierarchy = useCallback(async () => {
    try {
      await clearLeaderMutation.mutateAsync();
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }, [clearLeaderMutation]);

  const getLeaderStageConfig = useCallback(async (leaderId: string) => {
    if (!leaderId) return null;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, stage_count, stage_labels, response_labels')
        .ilike('leader_id', leaderId)
        .maybeSingle();

      if (error || !data) return null;

      return {
        stage_count: data.stage_count || 0,
        stage_labels: (data.stage_labels as string[]) || [],
        response_labels: (data.response_labels as string[]) || []
      };
    } catch {
      return null;
    }
  }, []);

  const updating = updateMutation.isPending || leaderMutation.isPending || clearLeaderMutation.isPending;

  return { 
    profile: profile ?? null, 
    loading, 
    updating, 
    updateProfile, 
    updateLeaderHierarchy,
    clearLeaderHierarchy,
    getLeaderStageConfig,
    refetch 
  };
}
