import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface UserWithSubscription {
  id: string;
  email: string;
  name: string | null;
  plan: 'free' | 'pro';
  is_admin_override: boolean;
  subscribed_at: string | null;
  expires_at: string | null;
}

export function useAdmin() {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [users, setUsers] = useState<UserWithSubscription[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const isFirstLoad = useRef(true);

  // Check if current user is admin using server-side has_role() function
  const checkIsAdmin = useCallback(async () => {
    if (!user) {
      setIsAdmin(false);
      setInitialLoading(false);
      return false;
    }
    
    try {
      const { data, error } = await supabase.rpc('has_role', {
        _user_id: user.id,
        _role: 'admin'
      });
      
      if (error) {
        console.error('Error checking admin role:', error);
        setIsAdmin(false);
      } else {
        setIsAdmin(data === true);
      }
    } catch (err) {
      console.error('Failed to check admin status:', err);
      setIsAdmin(false);
    }
    
    setInitialLoading(false);
  }, [user]);

  useEffect(() => {
    checkIsAdmin();
  }, [checkIsAdmin]);

  // Server-side search for users
  const fetchAllUsers = useCallback(async (searchQuery: string = '') => {
    if (!isAdmin) return;

    // Only show full loading on first load
    if (isFirstLoad.current) {
      setInitialLoading(true);
    } else {
      setSearching(true);
    }
    
    try {
      const { data, error } = await supabase.rpc('admin_search_users', {
        search_query: searchQuery
      });

      if (error) {
        console.error('Error fetching users:', error);
        return;
      }

      const usersWithSubs: UserWithSubscription[] = (data || []).map((row: any) => ({
        id: row.user_id,
        email: row.email || row.display_name || `User ${row.user_id?.slice(0, 8)}`,
        name: row.display_name,
        plan: (row.plan || 'free') as 'free' | 'pro',
        is_admin_override: row.is_admin_override || false,
        subscribed_at: row.subscribed_at || null,
        expires_at: row.expires_at || null,
      }));

      setUsers(usersWithSubs);
      isFirstLoad.current = false;
    } catch (err) {
      console.error('Error in fetchAllUsers:', err);
    } finally {
      setInitialLoading(false);
      setSearching(false);
    }
  }, [isAdmin]);

  const updateUserSubscription = async (userId: string, plan: 'free' | 'pro', durationDays?: number) => {
    try {
      console.log('Calling admin-update-subscription:', { userId, plan, durationDays });
      
      const { data, error } = await supabase.functions.invoke('admin-update-subscription', {
        body: {
          user_id: userId,
          plan,
          duration_days: durationDays,
        },
      });

      if (error) {
        console.error('Edge function error:', error);
        throw error;
      }
      
      console.log('Edge function response:', data);
      
      // Wait a bit for database to sync, then refetch
      await new Promise(resolve => setTimeout(resolve, 500));
      await fetchAllUsers();
      
      return { error: null, data };
    } catch (err: any) {
      console.error('Error updating subscription:', err);
      return { error: err };
    }
  };

  // Legacy toggle function for simple Pro/Free switch (uses 30 days default)
  const toggleUserAccess = async (userId: string, grantPro: boolean) => {
    return updateUserSubscription(userId, grantPro ? 'pro' : 'free', grantPro ? 30 : undefined);
  };

  return { 
    isAdmin, 
    users, 
    loading: initialLoading, 
    searching,
    fetchAllUsers, 
    toggleUserAccess, 
    updateUserSubscription 
  };
}
