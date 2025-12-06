import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const ADMIN_EMAIL = 'teamnevorai@gmail.com';

interface UserWithSubscription {
  id: string;
  email: string;
  name: string | null;
  plan: 'free' | 'pro';
  is_admin_override: boolean;
  subscribed_at: string | null;
}

export function useAdmin() {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [users, setUsers] = useState<UserWithSubscription[]>([]);
  const [loading, setLoading] = useState(true);

  // Check if current user is admin by email
  const checkIsAdmin = useCallback(() => {
    const adminStatus = user?.email === ADMIN_EMAIL;
    setIsAdmin(adminStatus);
    return adminStatus;
  }, [user]);

  useEffect(() => {
    checkIsAdmin();
    setLoading(false);
  }, [checkIsAdmin]);

  const fetchAllUsers = useCallback(async () => {
    if (!isAdmin) return;

    setLoading(true);
    
    // Fetch all profiles (admin can see all via RLS policy)
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('user_id, display_name');

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
      setLoading(false);
      return;
    }

    // Fetch all subscriptions (admin can see all via RLS policy)
    const { data: subscriptions, error: subsError } = await supabase
      .from('user_subscriptions')
      .select('*');

    if (subsError) {
      console.error('Error fetching subscriptions:', subsError);
    }

    // Fetch emails for each user using security definer function
    const usersWithSubs: UserWithSubscription[] = await Promise.all(
      (profiles || []).map(async (profile: any) => {
        const sub = subscriptions?.find((s: any) => s.user_id === profile.user_id);
        
        // Get email via security definer function
        const { data: emailData } = await supabase
          .rpc('get_user_email_for_admin', { target_user_id: profile.user_id });
        
        const email = emailData || profile.display_name || `User ${profile.user_id.slice(0, 8)}`;
        
        return {
          id: profile.user_id,
          email,
          name: profile.display_name,
          plan: sub?.plan || 'free',
          is_admin_override: sub?.is_admin_override || false,
          subscribed_at: sub?.subscribed_at || null,
        };
      })
    );

    setUsers(usersWithSubs);
    setLoading(false);
  }, [isAdmin]);

  const toggleUserAccess = async (userId: string, grantPro: boolean) => {
    // First check if subscription exists
    const { data: existing } = await supabase
      .from('user_subscriptions')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    if (existing) {
      // Update existing
      const { error } = await supabase
        .from('user_subscriptions')
        .update({
          plan: grantPro ? 'pro' : 'free',
          is_admin_override: grantPro,
        })
        .eq('user_id', userId);

      if (!error) {
        await fetchAllUsers();
      }
      return { error };
    } else {
      // Create new subscription
      const { error } = await supabase
        .from('user_subscriptions')
        .insert({
          user_id: userId,
          plan: grantPro ? 'pro' : 'free',
          is_admin_override: grantPro,
        });

      if (!error) {
        await fetchAllUsers();
      }
      return { error };
    }
  };

  return { isAdmin, users, loading, fetchAllUsers, toggleUserAccess };
}
