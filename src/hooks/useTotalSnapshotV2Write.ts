import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { tagNamesToSlotKeys } from '@/lib/snapshotSlotUtils';

interface SaveTotalParams {
  date: string;
  source: 'MANUAL' | 'TEAM_MEMBERS';
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
  responseTagNames?: string[];
  stageTagNames?: string[];
  memberUserIds?: string[];
  silent?: boolean;
}

export function useTotalSnapshotV2Write() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);

  const saveTotal = useCallback(async (params: SaveTotalParams) => {
    if (!user) return false;

    setSaving(true);
    try {
      const action = params.source === 'TEAM_MEMBERS' ? 'save_total_automated' : 'save_total_manual';

      const responseTags = params.responseTagNames
        ? tagNamesToSlotKeys(params.responseTagNames, params.responseTags, 'response_tag')
        : params.responseTags;
      const stageTags = params.stageTagNames
        ? tagNamesToSlotKeys(params.stageTagNames, params.stageTags, 'stage_tag')
        : params.stageTags;

      const { error } = await supabase.functions.invoke('update-tracking', {
        body: {
          action,
          date: params.date,
          total_leads: params.totalLeads,
          total_responses: params.totalResponses,
          response_tags: responseTags,
          stage_tags: stageTags,
          final_tag: params.finalTag,
          final_tag_count: params.finalTagCount,
          funnel_tag: params.funnelTag,
          funnel_tag_count: params.funnelTagCount,
          funnel_start_date: params.funnelStartDate,
          funnel_day: params.funnelDay,
          upline_leader_id: params.uplineLeaderId,
          member_user_ids: params.memberUserIds ?? [],
        },
      });

      if (error) {
        console.error('Error saving total snapshot:', error);
        if (!params.silent) toast.error('Failed to save total tracking');
        return false;
      }

      const monthYear = params.date.substring(0, 7);
      queryClient.invalidateQueries({ queryKey: ['total-snapshot-v2', user.id, monthYear] });
      queryClient.invalidateQueries({ queryKey: ['team-member-snapshots'] });
      window.dispatchEvent(
        new CustomEvent('trackup:total-snapshot-synced', {
          detail: { userId: user.id, month: monthYear },
        })
      );
      if (!params.silent) toast.success('Total tracking saved');
      return true;
    } catch (err) {
      console.error('Error saving total snapshot:', err);
      if (!params.silent) toast.error('Failed to save total tracking');
      return false;
    } finally {
      setSaving(false);
    }
  }, [user, queryClient]);

  return { saveTotal, saving };
}
