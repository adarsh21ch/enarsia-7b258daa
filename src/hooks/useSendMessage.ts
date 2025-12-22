import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { DirectTeamMember } from './useDirectTeam';

interface SendMessageParams {
  title: string;
  body: string;
  deepLinkRoute?: string | null;
  targetType: 'all' | 'level' | 'single';
  targetLevelPosition?: number | null;
  targetUserId?: string | null;
  members: DirectTeamMember[];
}

export function useSendMessage() {
  const [sending, setSending] = useState(false);
  const { user } = useAuth();

  const sendMessage = async ({
    title,
    body,
    deepLinkRoute,
    targetType,
    targetLevelPosition,
    targetUserId,
    members
  }: SendMessageParams): Promise<{ success: boolean; sentCount: number }> => {
    if (!user) {
      toast.error('Not authenticated');
      return { success: false, sentCount: 0 };
    }

    setSending(true);

    try {
      // Compute recipients based on target type
      let recipients: DirectTeamMember[] = [];
      
      if (targetType === 'all') {
        recipients = members;
      } else if (targetType === 'level' && targetLevelPosition) {
        recipients = members.filter(m => m.level_position === targetLevelPosition);
      } else if (targetType === 'single' && targetUserId) {
        recipients = members.filter(m => m.user_id === targetUserId);
      }

      if (recipients.length === 0) {
        toast.error('No recipients found');
        setSending(false);
        return { success: false, sentCount: 0 };
      }

      // Create message rows for each recipient
      const messages = recipients.map(r => ({
        recipient_user_id: r.user_id,
        sender_user_id: user.id,
        leader_id: user.id,
        target_level_position: targetType === 'level' ? targetLevelPosition : null,
        message_type: 'broadcast' as const,
        title,
        body,
        deep_link_route: deepLinkRoute || null
      }));

      const { error } = await supabase
        .from('inbox_messages')
        .insert(messages);

      if (error) {
        console.error('Error sending messages:', error);
        toast.error('Failed to send message');
        setSending(false);
        return { success: false, sentCount: 0 };
      }

      toast.success(`Sent to ${recipients.length} member${recipients.length === 1 ? '' : 's'}`);
      setSending(false);
      return { success: true, sentCount: recipients.length };
    } catch (error) {
      console.error('Error sending messages:', error);
      toast.error('Failed to send message');
      setSending(false);
      return { success: false, sentCount: 0 };
    }
  };

  return { sendMessage, sending };
}
