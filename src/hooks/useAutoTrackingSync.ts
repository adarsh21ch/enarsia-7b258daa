/**
 * Auto Tracking Sync Hook
 * 
 * Computes today's tracking numbers from the prospects table
 * and writes them to personal_snapshot_v2 with source='APPLICATION'.
 * Only active when personalSource === 'AUTO'.
 */
import { useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { usePersonalSnapshotV2Write } from '@/hooks/usePersonalSnapshotV2Write';
import { useTrackingFormat } from '@/hooks/useTrackingFormat';
import { useTrackingSourcePreferences } from '@/hooks/useTrackingSourcePreferences';
import { useFunnelConfig } from '@/hooks/useFunnelConfig';
import { getTodayIST, getISTDayBoundsUTC } from '@/lib/dateUtils';

export function useAutoTrackingSync() {
  const { user } = useAuth();
  const { savePersonal } = usePersonalSnapshotV2Write();
  const {
    leadsTrackingTagNames,
    stageTagNames,
    leadsFinalTargetTag,
    stageFinalTargetTag,
    directLeaderUserId,
  } = useTrackingFormat();
  const { personalSource } = useTrackingSourcePreferences();
  const { getEffectiveConfig } = useFunnelConfig();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const syncNow = useCallback(async () => {
    if (!user) return;

    const todayStr = getTodayIST();
    const { start: dayStart, end: dayEnd } = getISTDayBoundsUTC(todayStr);

    try {
      // Fetch today's prospects
      const { data: prospects, error } = await supabase
        .from('prospects')
        .select('id, action_taken, funnel_stage, date_added')
        .eq('user_id', user.id)
        .is('deleted_at', null)
        .gte('date_added', dayStart)
        .lte('date_added', dayEnd);

      if (error) {
        console.error('Auto-sync: error fetching prospects:', error);
        return;
      }

      const todayProspects = prospects || [];
      const totalLeads = todayProspects.length;

      // Count response tags
      const responseTags: Record<string, number> = {};
      let totalResponses = 0;
      leadsTrackingTagNames.forEach(tag => { responseTags[tag] = 0; });

      todayProspects.forEach(p => {
        if (p.action_taken) {
          totalResponses++;
          if (leadsTrackingTagNames.includes(p.action_taken)) {
            responseTags[p.action_taken] = (responseTags[p.action_taken] || 0) + 1;
          }
        }
      });

      // Count stage tags
      const stageTags: Record<string, number> = {};
      stageTagNames.forEach(tag => { stageTags[tag] = 0; });

      todayProspects.forEach(p => {
        if (p.funnel_stage && stageTagNames.includes(p.funnel_stage)) {
          stageTags[p.funnel_stage] = (stageTags[p.funnel_stage] || 0) + 1;
        }
      });

      // Final tag counts
      const finalTagCount = leadsFinalTargetTag ? (responseTags[leadsFinalTargetTag] || 0) : 0;
      const funnelTagCount = stageFinalTargetTag ? (stageTags[stageFinalTargetTag] || 0) : 0;

      // Funnel config
      const config = getEffectiveConfig();

      await savePersonal({
        date: todayStr,
        source: 'APPLICATION',
        totalLeads,
        totalResponses,
        responseTags,
        stageTags,
        finalTag: leadsFinalTargetTag,
        finalTagCount,
        funnelTag: stageFinalTargetTag,
        funnelTagCount,
        funnelStartDate: config?.day_1_start ?? null,
        funnelDay: null,
        uplineLeaderId: directLeaderUserId,
        responseTagNames: leadsTrackingTagNames,
        stageTagNames,
      });
    } catch (err) {
      console.error('Auto-sync: exception:', err);
    }
  }, [user, savePersonal, leadsTrackingTagNames, stageTagNames, leadsFinalTargetTag, stageFinalTargetTag, directLeaderUserId, getEffectiveConfig]);

  // Debounced trigger - only syncs when source is AUTO
  const triggerAutoSync = useCallback(() => {
    if (personalSource !== 'AUTO') return;

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      syncNow();
    }, 1000);
  }, [personalSource, syncNow]);

  return { triggerAutoSync };
}
