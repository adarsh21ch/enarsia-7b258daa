import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface SavePersonalParams {
  date: string;
  source: 'MANUAL' | 'APPLICATION';
  totalLeads: number;
  totalResponses: number;
  responseTags: Record<string, number>;
  stageTags: Record<string, number>;
  finalTag: string | null;
  finalTagCount: number;
  funnelTag: string | null;
  funnelTagCount: number;
  funnelStartDate: string | null;
  funnelDay: number | null;
  uplineLeaderId: string | null;
}

export function usePersonalSnapshotV2Write() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);

  const savePersonal = useCallback(async (params: SavePersonalParams) => {
    if (!user) return false;

    setSaving(true);
    try {
      const { error } = await supabase.functions.invoke('update-tracking', {
        body: {
          action: 'save_personal',
          date: params.date,
          source: params.source,
          total_leads: params.totalLeads,
          total_responses: params.totalResponses,
          response_tags: params.responseTags,
          stage_tags: params.stageTags,
          final_tag: params.finalTag,
          final_tag_count: params.finalTagCount,
          funnel_tag: params.funnelTag,
          funnel_tag_count: params.funnelTagCount,
          funnel_start_date: params.funnelStartDate,
          funnel_day: params.funnelDay,
          upline_leader_id: params.uplineLeaderId,
        },
      });

      if (error) {
        console.error('Error saving personal snapshot:', error);
        toast.error('Failed to save personal tracking');
        return false;
      }

      // Invalidate read queries
      const monthYear = params.date.substring(0, 7);
      queryClient.invalidateQueries({ queryKey: ['personal-snapshot-v2', user.id, monthYear] });
      window.dispatchEvent(
        new CustomEvent('trackup:personal-snapshot-synced', {
          detail: { userId: user.id, month: monthYear },
        })
      );
      toast.success('Personal tracking saved');
      return true;
    } catch (err) {
      console.error('Error saving personal snapshot:', err);
      toast.error('Failed to save personal tracking');
      return false;
    } finally {
      setSaving(false);
    }
  }, [user, queryClient]);

  return { savePersonal, saving };
}
