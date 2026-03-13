import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

type SubscribeResult = {
  ok: boolean;
  reason?: 'unsupported' | 'permission_blocked' | 'permission_denied' | 'missing_key' | 'subscribe_failed' | 'db_failed';
};

export function usePushNotifications() {
  const { user } = useAuth();
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);

  const getVapidPublicKey = useCallback(async (): Promise<string | null> => {
    const { data, error } = await supabase.functions.invoke('send-push-notification', {
      body: { action: 'get-public-key' },
    });

    if (error) {
      console.error('Failed to fetch VAPID public key:', error);
      return null;
    }

    return data?.publicKey || null;
  }, []);

  const checkSubscription = useCallback(async () => {
    if (!user || !isSupported) {
      setIsSubscribed(false);
      setLoading(false);
      return;
    }

    try {
      const reg = await navigator.serviceWorker.ready;
      const browserSub = await reg.pushManager.getSubscription();

      if (!browserSub) {
        setIsSubscribed(false);
        return;
      }

      const { data } = await supabase
        .from('push_subscriptions')
        .select('id')
        .eq('user_id', user.id)
        .eq('endpoint', browserSub.endpoint)
        .maybeSingle();

      setIsSubscribed(Boolean(data));
    } catch (error) {
      console.error('Error checking push subscription:', error);
      setIsSubscribed(false);
    } finally {
      setLoading(false);
    }
  }, [user, isSupported]);

  useEffect(() => {
    const supported =
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window;

    setIsSupported(supported);

    if (!supported) {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void checkSubscription();
  }, [checkSubscription]);

  const subscribe = useCallback(async (): Promise<SubscribeResult> => {
    if (!user || !isSupported) return { ok: false, reason: 'unsupported' };

    try {
      if (Notification.permission === 'denied') {
        return { ok: false, reason: 'permission_blocked' };
      }

      const permission =
        Notification.permission === 'granted'
          ? 'granted'
          : await Notification.requestPermission();

      if (permission !== 'granted') {
        return { ok: false, reason: 'permission_denied' };
      }

      const vapidKey = await getVapidPublicKey();
      if (!vapidKey) {
        return { ok: false, reason: 'missing_key' };
      }

      const reg = await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();

      if (!sub) {
        const rawServerKey = urlBase64ToUint8Array(vapidKey);
        const serverKey = new Uint8Array(rawServerKey.length);
        serverKey.set(rawServerKey);

        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: serverKey,
        });
      }

      const subJson = sub.toJSON();
      const { error } = await supabase.from('push_subscriptions').upsert(
        {
          user_id: user.id,
          endpoint: sub.endpoint,
          p256dh: subJson.keys?.p256dh || '',
          auth_key: subJson.keys?.auth || '',
        },
        { onConflict: 'user_id,endpoint' }
      );

      if (error) {
        console.error('Error saving subscription:', error);
        return { ok: false, reason: 'db_failed' };
      }

      setIsSubscribed(true);
      return { ok: true };
    } catch (error) {
      console.error('Error subscribing to push:', error);
      return { ok: false, reason: 'subscribe_failed' };
    }
  }, [user, isSupported, getVapidPublicKey]);

  const unsubscribe = useCallback(async () => {
    if (!user) return false;

    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();

      if (sub) {
        await sub.unsubscribe();

        await supabase
          .from('push_subscriptions')
          .delete()
          .eq('user_id', user.id)
          .eq('endpoint', sub.endpoint);
      }

      setIsSubscribed(false);
      return true;
    } catch (error) {
      console.error('Error unsubscribing from push:', error);
      return false;
    }
  }, [user]);

  const sendTestPush = useCallback(async () => {
    const { data, error } = await supabase.functions.invoke('send-push-notification', {
      body: { action: 'test-self' },
    });

    if (error) {
      console.error('Error sending test push:', error);
      return { ok: false, sent: 0 };
    }

    return { ok: true, sent: data?.sent ?? 0 };
  }, []);

  return {
    isSupported,
    isSubscribed,
    loading,
    subscribe,
    unsubscribe,
    sendTestPush,
    refreshSubscriptionState: checkSubscription,
  };
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}
