import { useCallback, useMemo, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type FunnelPlan = 'free' | 'pro';
export type FunnelTier = 'basic' | 'pro' | 'premium';

export interface FunnelSubscription {
  id: string;
  user_id: string;
  plan: FunnelPlan;
  status: string;
  is_admin_override: boolean;
  subscribed_at: string | null;
  expires_at: string | null;
  payment_id: string | null;
  subscription_source: string | null;
  created_at: string;
  updated_at: string;
}

export function useFunnelSubscription() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = ['funnel-subscription', user?.id];

  const { data: subscription, isLoading: loading, refetch } = useQuery({
    queryKey,
    queryFn: async (): Promise<FunnelSubscription | null> => {
      if (!user) return null;

      const { data, error } = await supabase
        .from('user_funnel_subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching funnel subscription:', error);
        throw error;
      }

      return data as FunnelSubscription | null;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  // Realtime listener
  useEffect(() => {
    if (!user) return;
    
    const channel = supabase
      .channel(`funnel-sub-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_funnel_subscriptions',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          queryClient.invalidateQueries({ queryKey });
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient, queryKey]);

  const plan = useMemo((): FunnelPlan => {
    if (!subscription) return 'free';
    // Admin overrides are always pro
    if (subscription.is_admin_override) return 'pro';
    if (!subscription.expires_at) return subscription.plan as FunnelPlan;
    if (new Date(subscription.expires_at) <= new Date()) return 'free';
    return subscription.plan as FunnelPlan;
  }, [subscription]);

  const isFunnelsPro = plan === 'pro';
  const isAdminOverride = subscription?.is_admin_override || false;

  // New tier-based state
  const funnelTier = useMemo((): FunnelTier => {
    if (!subscription) return 'basic';
    const tier = (subscription as any).tier as string | null;
    if (tier && ['basic', 'pro', 'premium'].includes(tier)) {
      if (tier !== 'basic') {
        if (subscription.is_admin_override) return tier as FunnelTier;
        if (subscription.expires_at && new Date(subscription.expires_at) <= new Date()) return 'basic';
        if (subscription.status !== 'active') return 'basic';
      }
      return tier as FunnelTier;
    }
    return isFunnelsPro ? 'pro' : 'basic';
  }, [subscription, isFunnelsPro]);

  const daysRemaining = useMemo(() => {
    if (!subscription?.expires_at || !isFunnelsPro) return 0;
    const diff = new Date(subscription.expires_at).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }, [subscription?.expires_at, isFunnelsPro]);

  return {
    subscription: subscription ?? null,
    loading,
    plan,
    funnelTier,
    isFunnelsPro,
    isAdminOverride,
    daysRemaining,
    refetch,
  };
}
