import { useCallback, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface Subscription {
  id: string;
  user_id: string;
  plan: 'free' | 'pro';
  is_admin_override: boolean;
  subscribed_at: string | null;
  expires_at: string | null;
  payment_id: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export function useSubscription() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = ['subscription', user?.id];

  const { data: subscription, isLoading: loading, refetch } = useQuery({
    queryKey,
    queryFn: async (): Promise<Subscription | null> => {
      if (!user) return null;

      const { data, error } = await supabase
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching subscription:', error);
        throw error;
      }

      if (!data) {
        // Create default free subscription
        const { data: newSub, error: insertError } = await supabase
          .from('user_subscriptions')
          .insert({ user_id: user.id, plan: 'free' })
          .select()
          .single();

        if (insertError) {
          console.error('Error creating subscription:', insertError);
          throw insertError;
        }

        return newSub as Subscription;
      }

      return data as Subscription;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });

  // Upgrade mutation
  const upgradeMutation = useMutation({
    mutationFn: async (paymentId: string) => {
      if (!user) throw new Error('No user');

      const now = new Date();
      const expiresAt = new Date(now);
      expiresAt.setDate(expiresAt.getDate() + 30);

      const { error } = await supabase
        .from('user_subscriptions')
        .update({
          plan: 'pro',
          status: 'active',
          subscribed_at: now.toISOString(),
          expires_at: expiresAt.toISOString(),
          payment_id: paymentId,
        })
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  // Derived state - memoized
  const isPro = useMemo(() => {
    if (!subscription) return false;
    if (subscription.plan !== 'pro') return false;
    if (!subscription.expires_at) return false;
    return new Date(subscription.expires_at) > new Date();
  }, [subscription]);

  const isAdminOverride = subscription?.is_admin_override || false;

  const daysRemaining = useMemo(() => {
    if (!subscription?.expires_at || !isPro) return 0;
    const diff = new Date(subscription.expires_at).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }, [subscription?.expires_at, isPro]);

  const upgradeToPro = useCallback(async (paymentId: string) => {
    try {
      await upgradeMutation.mutateAsync(paymentId);
      return { error: null };
    } catch (error) {
      return { error };
    }
  }, [upgradeMutation]);

  // Realtime subscription listener for cross-platform sync
  useEffect(() => {
    if (!user) return;
    
    const channel = supabase
      .channel(`subscription-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_subscriptions',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          // Refetch subscription when it changes (from admin panel, webhook, or other platform)
          queryClient.invalidateQueries({ queryKey });
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient, queryKey]);

  return { 
    subscription: subscription ?? null, 
    loading, 
    isPro, 
    isAdminOverride, 
    daysRemaining,
    upgradeToPro, 
    refetch 
  };
}
