import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { tagNamesToSlotKeys } from '@/lib/snapshotSlotUtils';

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
  responseTagNames?: string[];
  stageTagNames?: string[];
  silent?: boolean;
  /** Leader-on-behalf: when set, write the row with user_id=this member. Caller must be a direct upline. */
  onBehalfOfUserId?: string | null;
}

export function usePersonalSnapshotV2Write() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);

  const savePersonal = useCallback(async (params: SavePersonalParams) => {
    if (!user) return false;

    setSaving(true);
    try {
      const responseTags = params.responseTagNames
        ? tagNamesToSlotKeys(params.responseTagNames, params.responseTags, 'response_tag')
        : params.responseTags;
      const stageTags = params.stageTagNames
        ? tagNamesToSlotKeys(params.stageTagNames, params.stageTags, 'stage_tag')
        : params.stageTags;

      const { error } = await supabase.functions.invoke('update-tracking', {
        body: {
          action: 'save_personal',
          date: params.date,
          source: params.source,
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
          on_behalf_of_user_id: params.onBehalfOfUserId ?? null,
        },
      });

      if (error) {
        console.error('Error saving personal snapshot:', error);
        if (!params.silent) toast.error('Failed to save personal tracking');
        return false;
      }

      const monthYear = params.date.substring(0, 7);
      queryClient.invalidateQueries({ queryKey: ['personal-snapshot-v2', user.id, monthYear] });
      // Server-side trigger rolled up totals for this user + all ancestors —
      // invalidate every total-snapshot query so any visible upline refetches.
      queryClient.invalidateQueries({ queryKey: ['total-snapshot-v2'] });
      queryClient.invalidateQueries({ queryKey: ['team-member-snapshots'] });
      window.dispatchEvent(
        new CustomEvent('trackup:personal-snapshot-synced', {
          detail: { userId: user.id, month: monthYear },
        })
      );
      if (!params.silent) toast.success('Personal tracking saved');
      return true;
    } catch (err) {
      console.error('Error saving personal snapshot:', err);
      if (!params.silent) toast.error('Failed to save personal tracking');
      return false;
    } finally {
      setSaving(false);
    }
  }, [user, queryClient]);

  return { savePersonal, saving };
}
