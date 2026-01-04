import { useState, useEffect, useCallback } from 'react';
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
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchSubscription = useCallback(async () => {
    if (!user) {
      setSubscription(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      console.error('Error fetching subscription:', error);
    } else if (!data) {
      // Create default free subscription
      const { data: newSub, error: insertError } = await supabase
        .from('user_subscriptions')
        .insert({ user_id: user.id, plan: 'free' })
        .select()
        .single();

      if (insertError) {
        console.error('Error creating subscription:', insertError);
      } else {
        setSubscription(newSub as Subscription);
      }
    } else {
      setSubscription(data as Subscription);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  // Check if Pro is active and not expired
  // isPro is true ONLY when: plan='pro' AND expires_at is not null AND expires_at > now
  const isProActive = () => {
    if (!subscription) return false;
    if (subscription.plan !== 'pro') return false;
    
    // Must have an expiry date
    if (!subscription.expires_at) return false;
    
    // Check if not expired
    const expiresAt = new Date(subscription.expires_at);
    const now = new Date();
    return expiresAt > now;
  };

  const isPro = isProActive();
  const isAdminOverride = subscription?.is_admin_override || false;
  
  // Calculate days remaining
  const daysRemaining = () => {
    if (!subscription?.expires_at || !isPro) return 0;
    const expiresAt = new Date(subscription.expires_at);
    const now = new Date();
    const diff = expiresAt.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  const upgradeToPro = async (paymentId: string) => {
    if (!user) return { error: 'No user' };

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

    if (!error) {
      await fetchSubscription();
    }
    return { error };
  };

  return { 
    subscription, 
    loading, 
    isPro, 
    isAdminOverride, 
    daysRemaining: daysRemaining(),
    upgradeToPro, 
    refetch: fetchSubscription 
  };
}
