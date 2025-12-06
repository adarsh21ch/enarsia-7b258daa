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
  created_at: string;
  updated_at: string;
}

export interface ProfileUpdate {
  display_name?: string | null;
  phone?: string | null;
  company_name?: string | null;
  city?: string | null;
  bio?: string | null;
  avatar_url?: string | null;
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
        setProfile(newProfile as Profile);
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
      setProfile(data as Profile);
    }
    setLoading(false);
  }, [user, toast, decryptFields]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const updateProfile = async (updates: ProfileUpdate) => {
    if (!user || !profile) return { error: 'No user or profile' };

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
    
    const { error } = await supabase
      .from('profiles')
      .update(encryptedUpdates)
      .eq('user_id', user.id);

    if (error) {
      toast({ title: 'Error updating profile', variant: 'destructive' });
      setUpdating(false);
      return { error };
    }

    // Store decrypted version in state for display
    setProfile(prev => prev ? { ...prev, ...updates } : null);
    toast({ title: 'Profile updated successfully' });
    setUpdating(false);
    return { error: null };
  };

  return { profile, loading, updating, updateProfile, refetch: fetchProfile };
}
