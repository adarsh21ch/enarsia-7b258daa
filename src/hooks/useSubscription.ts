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

  const isPro = subscription?.plan === 'pro';
  const isAdminOverride = subscription?.is_admin_override || false;

  const upgradeToPro = async (paymentId: string) => {
    if (!user) return { error: 'No user' };

    const { error } = await supabase
      .from('user_subscriptions')
      .update({
        plan: 'pro',
        subscribed_at: new Date().toISOString(),
        payment_id: paymentId,
      })
      .eq('user_id', user.id);

    if (!error) {
      await fetchSubscription();
    }
    return { error };
  };

  return { subscription, loading, isPro, isAdminOverride, upgradeToPro, refetch: fetchSubscription };
}
