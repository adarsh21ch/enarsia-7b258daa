import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

type SendACNotificationParams = {
  type: 'announcement' | 'chat' | 'event' | 'update';
  contextName: string;
  contextId?: string;
  senderName: string;
  senderId?: string;
  title: string;
  body: string;
  url?: string;
  recipientUserIds?: string[];
  excludeUserIds?: string[];
};

export function useACNotifications() {
  const sendNotification = useCallback(async (params: SendACNotificationParams) => {
    const { data, error } = await supabase.functions.invoke('send-ac-notification', {
      body: params,
    });

    if (error) {
      console.error('Failed to send AC notification:', error);
      return { ok: false, error };
    }

    return { ok: true, ...data };
  }, []);

  return { sendNotification };
}
