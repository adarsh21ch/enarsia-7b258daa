import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function usePushNotifications() {
  const { user } = useAuth();
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
    setIsSupported(supported);
    if (supported && user) {
      checkSubscription();
    } else {
      setLoading(false);
    }
  }, [user]);

  const checkSubscription = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        // Check if it exists in DB
        const { data } = await supabase
          .from('push_subscriptions')
          .select('id')
          .eq('user_id', user.id)
          .eq('endpoint', sub.endpoint)
          .maybeSingle();
        setIsSubscribed(!!data);
      } else {
        setIsSubscribed(false);
      }
    } catch (e) {
      console.error('Error checking push subscription:', e);
      setIsSubscribed(false);
    }
    setLoading(false);
  }, [user]);

  const getVapidPublicKey = async (): Promise<string | null> => {
    const { data } = await supabase
      .from('admin_config_text')
      .select('config_value')
      .eq('config_key', 'vapid_public_key')
      .maybeSingle();
    return data?.config_value || null;
  };

  const subscribe = useCallback(async () => {
    if (!user || !isSupported) return false;
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') return false;

      // Get VAPID public key - generate if needed
      let vapidKey = await getVapidPublicKey();
      if (!vapidKey) {
        // Trigger key generation via edge function
        const { data } = await supabase.functions.invoke('send-push-notification', {
          body: { action: 'generate-keys' },
        });
        vapidKey = data?.publicKey;
        if (!vapidKey) {
          console.error('Failed to get VAPID public key');
          return false;
        }
      }

      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });

      const subJson = sub.toJSON();
      const { error } = await supabase.from('push_subscriptions').upsert({
        user_id: user.id,
        endpoint: sub.endpoint,
        p256dh: subJson.keys?.p256dh || '',
        auth_key: subJson.keys?.auth || '',
      }, { onConflict: 'user_id,endpoint' });

      if (error) {
        console.error('Error saving subscription:', error);
        return false;
      }
      setIsSubscribed(true);
      return true;
    } catch (e) {
      console.error('Error subscribing:', e);
      return false;
    }
  }, [user, isSupported]);

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
    } catch (e) {
      console.error('Error unsubscribing:', e);
      return false;
    }
  }, [user]);

  return { isSupported, isSubscribed, loading, subscribe, unsubscribe };
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
