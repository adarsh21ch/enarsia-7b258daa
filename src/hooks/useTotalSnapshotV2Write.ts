import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { tagNamesToSlotKeys } from '@/lib/snapshotSlotUtils';

const WEBSITE_EDGE_URL = 'https://xjnzxxmpidrqjtlvslui.supabase.co/functions/v1/update-tracking';
const WEBSITE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhqbnp4eG1waWRycWp0bHZzbHVpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0NzQzNTEsImV4cCI6MjA4MTA1MDM1MX0.37yYhOMcWZh_bKK6Kya15cdPC1NVE9gf6itpWPJO7r4';

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
}

export function useTotalSnapshotV2Write() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);

  const saveTotal = useCallback(async (params: SaveTotalParams) => {
    if (!user) return false;

    setSaving(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const appToken = sessionData.session?.access_token;
      if (!appToken) {
        toast.error('Please log in first');
        return false;
      }

      const action = params.source === 'TEAM_MEMBERS' ? 'save_total_automated' : 'save_total_manual';

      // Convert tag names to slot keys if tag name arrays are provided
      const responseTags = params.responseTagNames
        ? tagNamesToSlotKeys(params.responseTagNames, params.responseTags, 'response_tag')
        : params.responseTags;
      const stageTags = params.stageTagNames
        ? tagNamesToSlotKeys(params.stageTagNames, params.stageTags, 'stage_tag')
        : params.stageTags;

      const response = await fetch(WEBSITE_EDGE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${WEBSITE_ANON_KEY}`,
          'apikey': WEBSITE_ANON_KEY,
        },
        body: JSON.stringify({
          action,
          app_access_token: appToken,
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
        }),
      });

      if (!response.ok) {
        const errBody = await response.text();
        console.error('Error saving total snapshot:', errBody);
        toast.error('Failed to save total tracking');
        return false;
      }

      const monthYear = params.date.substring(0, 7);
      queryClient.invalidateQueries({ queryKey: ['total-snapshot-v2', user.id, monthYear] });
      window.dispatchEvent(
        new CustomEvent('trackup:total-snapshot-synced', {
          detail: { userId: user.id, month: monthYear },
        })
      );
      toast.success('Total tracking saved');
      return true;
    } catch (err) {
      console.error('Error saving total snapshot:', err);
      toast.error('Failed to save total tracking');
      return false;
    } finally {
      setSaving(false);
    }
  }, [user, queryClient]);

  return { saveTotal, saving };
}
