import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface InboxMessage {
  id: string;
  recipient_user_id: string;
  sender_user_id: string;
  leader_id: string | null;
  target_level_position: number | null;
  message_type: 'broadcast' | 'task_today_only' | 'system';
  title: string;
  body: string;
  deep_link_route: string | null;
  created_at: string;
  read_at: string | null;
  archived: boolean;
}

export function useInbox() {
  const [messages, setMessages] = useState<InboxMessage[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchMessages = useCallback(async () => {
    if (!user) {
      setMessages([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from('inbox_messages')
      .select('*')
      .eq('recipient_user_id', user.id)
      .eq('archived', false)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching inbox:', error);
      toast.error('Failed to load inbox');
    } else {
      setMessages((data || []) as InboxMessage[]);
      setUnreadCount((data || []).filter(m => !m.read_at).length);
    }
    setLoading(false);
  }, [user]);

  // Fetch unread count only (for badge)
  const fetchUnreadCount = useCallback(async () => {
    if (!user) {
      setUnreadCount(0);
      return;
    }

    const { count, error } = await supabase
      .from('inbox_messages')
      .select('*', { count: 'exact', head: true })
      .eq('recipient_user_id', user.id)
      .eq('archived', false)
      .is('read_at', null);

    if (!error && count !== null) {
      setUnreadCount(count);
    }
  }, [user]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Real-time subscription
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('inbox-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'inbox_messages',
          filter: `recipient_user_id=eq.${user.id}`
        },
        () => {
          fetchMessages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchMessages]);

  const markAsRead = async (messageId: string) => {
    if (!user) return;

    const { error } = await supabase
      .from('inbox_messages')
      .update({ read_at: new Date().toISOString() })
      .eq('id', messageId)
      .eq('recipient_user_id', user.id);

    if (error) {
      console.error('Error marking as read:', error);
    } else {
      setMessages(prev => 
        prev.map(m => m.id === messageId ? { ...m, read_at: new Date().toISOString() } : m)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
  };

  const archiveMessage = async (messageId: string) => {
    if (!user) return;

    const { error } = await supabase
      .from('inbox_messages')
      .update({ archived: true })
      .eq('id', messageId)
      .eq('recipient_user_id', user.id);

    if (error) {
      console.error('Error archiving message:', error);
      toast.error('Failed to archive message');
    } else {
      const wasUnread = messages.find(m => m.id === messageId && !m.read_at);
      setMessages(prev => prev.filter(m => m.id !== messageId));
      if (wasUnread) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
      toast.success('Message archived');
    }
  };

  return {
    messages,
    unreadCount,
    loading,
    fetchMessages,
    fetchUnreadCount,
    markAsRead,
    archiveMessage
  };
}
