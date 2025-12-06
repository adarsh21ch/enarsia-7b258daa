import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const ADMIN_EMAIL = 'teamnevorai@gmail.com';

interface UserWithSubscription {
  id: string;
  email: string;
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
    // Fetch all subscriptions with profile info
    const { data: subscriptions, error } = await supabase
      .from('user_subscriptions')
      .select('*');

    if (error) {
      console.error('Error fetching users:', error);
      setLoading(false);
      return;
    }

    // Get profiles for these users
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, display_name');

    // Combine the data
    const usersWithSubs: UserWithSubscription[] = (subscriptions || []).map((sub: any) => {
      const profile = profiles?.find((p: any) => p.user_id === sub.user_id);
      return {
        id: sub.user_id,
        email: profile?.display_name || sub.user_id.slice(0, 8),
        plan: sub.plan,
        is_admin_override: sub.is_admin_override,
        subscribed_at: sub.subscribed_at,
      };
    });

    setUsers(usersWithSubs);
    setLoading(false);
  }, [isAdmin]);

  const toggleUserAccess = async (userId: string, grantPro: boolean) => {
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
  };

  return { isAdmin, users, loading, fetchAllUsers, toggleUserAccess };
}
