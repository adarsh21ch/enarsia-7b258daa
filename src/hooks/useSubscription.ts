import { useCallback, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type SubscriptionPlan = 'free' | 'pro';
export type SubscriptionTier = 'basic' | 'pro' | 'premium';

export interface Subscription {
  id: string;
  user_id: string;
  plan: SubscriptionPlan;
  is_admin_override: boolean;
  subscribed_at: string | null;
  expires_at: string | null;
  payment_id: string | null;
  status: string;
  subscription_source: string | null;
  razorpay_subscription_id: string | null;
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
    mutationFn: async ({ paymentId, plan, source }: { paymentId: string; plan: SubscriptionPlan; source: string }) => {
      if (!user) throw new Error('No user');

      const now = new Date();
      const expiresAt = new Date(now);
      expiresAt.setDate(expiresAt.getDate() + 30);

      const { error } = await supabase
        .from('user_subscriptions')
        .update({
          plan: plan as 'free' | 'pro',
          status: 'active',
          subscribed_at: now.toISOString(),
          expires_at: expiresAt.toISOString(),
          payment_id: paymentId,
          subscription_source: source,
        })
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  // Derived state - memoized
  const plan = useMemo((): SubscriptionPlan => {
    if (!subscription) return 'free';
    if (!subscription.expires_at) return subscription.plan as SubscriptionPlan;
    if (new Date(subscription.expires_at) <= new Date()) return 'free';
    // Treat both 'pro' and legacy 'mini' as pro
    const currentPlan = subscription.plan as string;
    if (currentPlan === 'pro' || currentPlan === 'mini') return 'pro';
    return subscription.plan as SubscriptionPlan;
  }, [subscription]);

  // New tier-based derived state
  const userTier = useMemo((): SubscriptionTier => {
    if (!subscription) return 'basic';
    const tier = (subscription as any).tier as string | null;
    // If tier column exists and is set, use it
    if (tier && ['basic', 'pro', 'premium'].includes(tier)) {
      // But verify subscription is still active
      if (tier !== 'basic') {
        const isAdminOvr = subscription.is_admin_override;
        if (isAdminOvr) return tier as SubscriptionTier;
        if (subscription.expires_at && new Date(subscription.expires_at) <= new Date()) return 'basic';
        if (subscription.status !== 'active') return 'basic';
      }
      return tier as SubscriptionTier;
    }
    // Fallback: derive from plan
    return plan === 'pro' ? 'pro' : 'basic';
  }, [subscription, plan]);

  const isPro = userTier === 'pro' || userTier === 'premium';
  const isPremium = userTier === 'premium';
  const isPaid = userTier !== 'basic';

  const isAdminOverride = subscription?.is_admin_override || false;

  const daysRemaining = useMemo(() => {
    if (!subscription?.expires_at || !isPaid) return 0;
    const diff = new Date(subscription.expires_at).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }, [subscription?.expires_at, isPaid]);

  const upgradeToPlan = useCallback(async (paymentId: string, newPlan: SubscriptionPlan, source: string) => {
    try {
      await upgradeMutation.mutateAsync({ paymentId, plan: newPlan, source });
      return { error: null };
    } catch (error) {
      return { error };
    }
  }, [upgradeMutation]);

  // Refetch when window regains focus (e.g. user returns from Razorpay checkout
  // in another tab/app). Ensures expired/at-limit gates clear immediately on pay.
  useEffect(() => {
    if (!user) return;
    const onFocus = () => queryClient.invalidateQueries({ queryKey });
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [user, queryClient, queryKey]);

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
    plan,
    userTier,
    isPro, 
    isPremium,
    isPaid,
    isAdminOverride, 
    daysRemaining,
    upgradeToPlan, 
    refetch 
  };
}
