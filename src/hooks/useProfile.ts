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
  neverai_id: string | null;
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
  /** Monotonic counter for lifetime leads added - never decreases */
  total_leads_added: number;
  /** Upline's email address (new simplified identifier) */
  upline_email: string | null;
  /** User's email address for display */
  email: string | null;
  /** WhatsApp / phone number for outreach */
  phone_number: string | null;
  /** How user found the app */
  signup_source: string | null;
  /** Whether onboarding flow is completed */
  onboarding_completed: boolean;
  /** Whether onboarding was skipped */
  onboarding_skipped: boolean;
  /** Current onboarding step (0-12) */
  onboarding_step: number;
  /** Whether the WA community popup was shown */
  whatsapp_popup_shown: boolean;
  /** Whether user joined the WA community */
  whatsapp_community_joined: boolean;
  /** When user joined WA community */
  whatsapp_joined_at: string | null;
  /** Active app Mode (multi-profession): network_marketing | content_creator | founder */
  mode: string;
  /** Professions the user has chosen/added. Always includes the base (network_marketing). */
  enabled_modes: string[];
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
  upline_email?: string | null;
  mode?: string;
  enabled_modes?: string[];
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
        // Profile should be auto-created by database trigger on signup
        // Retry once after a short delay
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const { data: retryData, error: retryError } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();
          
        if (retryError || !retryData) {
          console.error('Profile not found after retry');
          return null;
        }

        return {
          ...retryData,
          stage_labels: retryData.stage_labels || [],
          response_labels: retryData.response_labels || [],
          total_leads_added: retryData.total_leads_added ?? 0,
          mode: (retryData as { mode?: string }).mode || 'network_marketing',
          enabled_modes: (retryData as { enabled_modes?: string[] }).enabled_modes || ['network_marketing'],
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

      return {
        ...data,
        stage_labels: data.stage_labels || [],
        response_labels: data.response_labels || [],
        total_leads_added: data.total_leads_added ?? 0,
        upline_email: data.upline_email || null,
        phone_number: data.phone_number || null,
        signup_source: data.signup_source || null,
        onboarding_completed: data.onboarding_completed ?? false,
        onboarding_skipped: data.onboarding_skipped ?? false,
        onboarding_step: data.onboarding_step ?? 0,
        whatsapp_popup_shown: data.whatsapp_popup_shown ?? false,
        whatsapp_community_joined: data.whatsapp_community_joined ?? false,
        whatsapp_joined_at: data.whatsapp_joined_at || null,
        mode: (data as { mode?: string }).mode || 'network_marketing',
        enabled_modes: (data as { enabled_modes?: string[] }).enabled_modes || ['network_marketing'],
      } as Profile;
    },
    enabled: !!user,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true,
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

      // Profile is auto-created by database trigger, no need to check/insert

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

  // Leader hierarchy mutation (legacy - still works with Leader ID)
  const leaderMutation = useMutation({
    mutationFn: async (leaderNeveraiId: string) => {
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase.rpc('update_leader_hierarchy', {
        p_user_id: user.id,
        p_leader_id: leaderNeveraiId
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
      toast({ title: 'Connected to upline successfully' });
    },
    onError: () => {
      toast({ title: 'Error connecting to upline', variant: 'destructive' });
    },
  });

  // Upline by email mutation (NEW - preferred method)
  const uplineByEmailMutation = useMutation({
    mutationFn: async (uplineEmail: string) => {
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase.rpc('update_upline_by_email', {
        p_user_id: user.id,
        p_upline_email: uplineEmail.trim().toLowerCase()
      });

      if (error) throw error;

      const result = data as { success: boolean; error?: string; upline_email?: string; upline_name?: string; leaders_id_of_my_leader?: string; root_leader_id?: string };
      if (!result.success) throw new Error(result.error || 'Failed to connect to upline');
      
      return result;
    },
    onSuccess: (result) => {
      queryClient.setQueryData<Profile>(queryKey, (prev) => prev ? {
        ...prev,
        upline_email: result.upline_email || null,
        leaders_id_of_my_leader: result.leaders_id_of_my_leader || null,
        root_leader_id: result.root_leader_id || null
      } : prev);
      toast({ title: `Connected to ${result.upline_name || result.upline_email}` });
    },
    onError: () => {
      toast({ title: 'Error connecting to upline', variant: 'destructive' });
    },
  });

  // Clear upline mutation
  const clearLeaderMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase.rpc('clear_upline_relationship', {
        p_user_id: user.id
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.setQueryData<Profile>(queryKey, (prev) => prev ? {
        ...prev,
        upline_email: null,
        leaders_id_of_my_leader: null,
        root_leader_id: null
      } : prev);
      toast({ title: 'Upline disconnected' });
    },
    onError: () => {
      toast({ title: 'Error disconnecting upline', variant: 'destructive' });
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

  // Legacy: Update by Leader ID (still supported for backward compatibility)
  const updateLeaderHierarchy = useCallback(async (leaderNeveraiId: string) => {
    try {
      await leaderMutation.mutateAsync(leaderNeveraiId);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }, [leaderMutation]);

  // NEW: Update by upline email (preferred method)
  const updateUplineByEmail = useCallback(async (uplineEmail: string) => {
    try {
      const result = await uplineByEmailMutation.mutateAsync(uplineEmail);
      return { success: true, uplineName: result.upline_name };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }, [uplineByEmailMutation]);

  const clearLeaderHierarchy = useCallback(async () => {
    try {
      await clearLeaderMutation.mutateAsync();
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }, [clearLeaderMutation]);

  const getLeaderStageConfig = useCallback(async (leaderNeveraiId: string) => {
    if (!leaderNeveraiId) return null;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, stage_count, stage_labels, response_labels')
        .ilike('neverai_id', leaderNeveraiId)
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

  const updating = updateMutation.isPending || leaderMutation.isPending || uplineByEmailMutation.isPending || clearLeaderMutation.isPending;

  return { 
    profile: profile ?? null, 
    loading, 
    updating, 
    updateProfile, 
    updateLeaderHierarchy,
    updateUplineByEmail,
    clearLeaderHierarchy,
    getLeaderStageConfig,
    refetch 
  };
}
