import { useState, useEffect, useCallback } from 'react';
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
  neverai_id: string | null; // This is the Leader ID
  level_id: string | null; // FK to leader_levels
  created_at: string;
  updated_at: string;
  // Leader hierarchy fields
  leaders_id_of_my_leader: string | null;
  root_leader_id: string | null;
  allow_leader_to_view: boolean;
  leader_prompt_completed: boolean; // Flag to track if leader prompt was shown
  // Stage configuration fields
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
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const { encryptFields, decryptFields } = useEncryption();

  const fetchProfile = useCallback(async () => {
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      console.error('Error fetching profile:', error);
      toast({ title: 'Error loading profile', variant: 'destructive' });
    } else if (!data) {
      // Profile doesn't exist, create it
      const { data: newProfile, error: insertError } = await supabase
        .from('profiles')
        .insert({ user_id: user.id })
        .select()
        .single();

      if (insertError) {
        console.error('Error creating profile:', insertError);
      } else {
        const profileData = {
          ...newProfile,
          stage_labels: newProfile.stage_labels || [],
          response_labels: newProfile.response_labels || [],
        } as Profile;
        setProfile(profileData);
      }
    } else {
      // Decrypt phone if it exists
      if (data.phone) {
        try {
          const decrypted = await decryptFields({ phone: data.phone });
          data.phone = decrypted.phone || data.phone;
        } catch {
          // If decryption fails, phone might be unencrypted (legacy data)
        }
      }
      const profileData = {
        ...data,
        stage_labels: data.stage_labels || [],
        response_labels: data.response_labels || [],
      } as Profile;
      setProfile(profileData);
    }
    setLoading(false);
  }, [user, toast]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const updateProfile = async (updates: ProfileUpdate) => {
    if (!user) return { error: 'No user' };

    setUpdating(true);

    // Encrypt phone if provided
    let encryptedUpdates = { ...updates };
    if (updates.phone) {
      try {
        const encrypted = await encryptFields({ phone: updates.phone });
        encryptedUpdates.phone = encrypted.phone || updates.phone;
      } catch {
        // Continue with unencrypted if encryption fails
      }
    }

    // Ensure a profile row exists (new users may call update before initial fetch finishes)
    const { data: existingProfile, error: existingError } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (existingError) {
      toast({ title: 'Error updating profile', variant: 'destructive' });
      setUpdating(false);
      return { error: existingError };
    }

    if (!existingProfile) {
      const { error: insertError } = await supabase.from('profiles').insert({ user_id: user.id } as any);
      if (insertError) {
        toast({ title: 'Error updating profile', variant: 'destructive' });
        setUpdating(false);
        return { error: insertError };
      }
    }

    const { error } = await supabase
      .from('profiles')
      .update(encryptedUpdates as any)
      .eq('user_id', user.id);

    if (error) {
      toast({ title: 'Error updating profile', variant: 'destructive' });
      setUpdating(false);
      return { error };
    }

    // Store decrypted version in state for display (or refetch if we don't have it yet)
    if (profile) {
      setProfile(prev => (prev ? { ...prev, ...updates } : null));
    } else {
      await fetchProfile();
    }

    toast({ title: 'Profile updated successfully' });
    setUpdating(false);
    return { error: null };
  };

  // Update leader hierarchy using database function
  const updateLeaderHierarchy = async (leaderNeveraiId: string) => {
    if (!user) return { success: false, error: 'Not authenticated' };

    setUpdating(true);
    const { data, error } = await supabase.rpc('update_leader_hierarchy', {
      p_user_id: user.id,
      p_leader_neverai_id: leaderNeveraiId
    });

    if (error) {
      console.error('Error updating leader hierarchy:', error);
      toast({ title: 'Error updating leader', variant: 'destructive' });
      setUpdating(false);
      return { success: false, error: error.message };
    }

    const result = data as { success: boolean; error?: string; leaders_id_of_my_leader?: string; root_leader_id?: string };
    
    if (!result.success) {
      toast({ title: result.error || 'Failed to update leader', variant: 'destructive' });
      setUpdating(false);
      return { success: false, error: result.error };
    }

    // Update local state
    setProfile(prev => prev ? {
      ...prev,
      leaders_id_of_my_leader: result.leaders_id_of_my_leader || null,
      root_leader_id: result.root_leader_id || null
    } : null);

    toast({ title: 'Leader updated successfully' });
    setUpdating(false);
    return { success: true };
  };

  // Clear leader hierarchy
  const clearLeaderHierarchy = async () => {
    if (!user) return { success: false, error: 'Not authenticated' };

    setUpdating(true);
    const { error } = await supabase
      .from('profiles')
      .update({
        leaders_id_of_my_leader: null,
        root_leader_id: null
      })
      .eq('user_id', user.id);

    if (error) {
      toast({ title: 'Error clearing leader', variant: 'destructive' });
      setUpdating(false);
      return { success: false, error: error.message };
    }

    setProfile(prev => prev ? {
      ...prev,
      leaders_id_of_my_leader: null,
      root_leader_id: null
    } : null);

    toast({ title: 'Leader cleared successfully' });
    setUpdating(false);
    return { success: true };
  };

  // Get leader's stage configuration by neverai_id
  const getLeaderStageConfig = async (leaderNeveraiId: string) => {
    if (!leaderNeveraiId) return null;
    
    try {
      // First get the leader's user_id from their neverai_id
      const { data: leaderData, error: leaderError } = await supabase
        .from('profiles')
        .select('user_id, stage_count, stage_labels, response_labels')
        .ilike('neverai_id', leaderNeveraiId)
        .maybeSingle();

      if (leaderError || !leaderData) {
        console.error('Leader not found:', leaderError);
        return null;
      }

      return {
        stage_count: leaderData.stage_count || 0,
        stage_labels: (leaderData.stage_labels as string[]) || [],
        response_labels: (leaderData.response_labels as string[]) || []
      };
    } catch (error) {
      console.error('Error fetching leader stage config:', error);
      return null;
    }
  };

  return { 
    profile, 
    loading, 
    updating, 
    updateProfile, 
    updateLeaderHierarchy,
    clearLeaderHierarchy,
    getLeaderStageConfig,
    refetch: fetchProfile 
  };
}
