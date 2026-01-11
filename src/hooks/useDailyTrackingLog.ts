/**
 * Daily Tracking Log - Foundation Hook (WRITE-ONLY)
 * 
 * PURPOSE: Record daily tracking counts as immutable history
 * - This is the SINGLE source of truth for historical tracking data
 * - NEVER modifies previous days
 * - Only updates today's log on tracking changes
 * 
 * USAGE: Call logDailyTracking() after any tracking update
 */
import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format, startOfDay, endOfDay } from 'date-fns';

interface DailyTrackingCounts {
  leadsCount: number;
  responsesCount: number;
  noContactCount: number;
  videoSentCount: number;
  enrolledCount: number;
  responseTags: Record<string, number>;
  stageTags: Record<string, number>;
  finalTag: string | null;
  finalStageTag: string | null;
}

/**
 * Hook to write daily tracking logs
 * 
 * This is WRITE-ONLY for now. Dashboard will read from this later.
 */
export function useDailyTrackingLog() {
  const { user } = useAuth();

  /**
   * Calculate today's tracking counts from prospects and upsert to daily_tracking_logs
   * 
   * @param trackingTags - Array of response/leads tracking tag names
   * @param stageTags - Array of funnel stage tag names
   * @param finalLeadsTag - The final tag in leads tracking (e.g., "Enrolled")
   * @param finalStageTag - The final tag in funnel tracking (e.g., "Level Up")
   */
  const logDailyTracking = useCallback(async (
    trackingTags: string[] = [],
    stageTags: string[] = [],
    finalLeadsTag: string | null = null,
    finalStageTag: string | null = null
  ) => {
    if (!user) return;

    const today = new Date();
    const todayStr = format(today, 'yyyy-MM-dd');
    const dayStart = startOfDay(today).toISOString();
    const dayEnd = endOfDay(today).toISOString();

    try {
      // Fetch today's prospects for this user
      const { data: prospects, error: fetchError } = await supabase
        .from('prospects')
        .select('id, action_taken, funnel_stage, date_added')
        .eq('user_id', user.id)
        .gte('date_added', dayStart)
        .lte('date_added', dayEnd);

      if (fetchError) {
        console.error('Error fetching today\'s prospects for daily log:', fetchError);
        return;
      }

      const todayProspects = prospects || [];

      // Calculate counts
      const leadsCount = todayProspects.length;
      
      // Response tag counts
      const responseTags: Record<string, number> = {};
      let responsesCount = 0;
      let noContactCount = 0;
      let enrolledCount = 0;

      trackingTags.forEach(tag => {
        responseTags[tag] = 0;
      });

      todayProspects.forEach(p => {
        if (p.action_taken) {
          responsesCount++;
          
          if (trackingTags.includes(p.action_taken)) {
            responseTags[p.action_taken] = (responseTags[p.action_taken] || 0) + 1;
          }
          
          // Check for special tags
          if (p.action_taken === 'No Contact' || p.action_taken.toLowerCase().includes('no contact')) {
            noContactCount++;
          }
          if (p.action_taken === 'Enrolled' || p.action_taken.toLowerCase().includes('enroll')) {
            enrolledCount++;
          }
        }
      });

      // Stage tag counts
      const stageTagCounts: Record<string, number> = {};
      let videoSentCount = 0;

      stageTags.forEach(tag => {
        stageTagCounts[tag] = 0;
      });

      todayProspects.forEach(p => {
        if (p.funnel_stage && stageTags.includes(p.funnel_stage)) {
          stageTagCounts[p.funnel_stage] = (stageTagCounts[p.funnel_stage] || 0) + 1;
        }
        
        // Check for video sent
        if (p.funnel_stage === 'Video Sent' || (p.funnel_stage || '').toLowerCase().includes('video')) {
          videoSentCount++;
        }
      });

      // Upsert today's log (single write, no loops)
      const { error: upsertError } = await supabase
        .from('daily_tracking_logs')
        .upsert({
          user_id: user.id,
          log_date: todayStr,
          leads_count: leadsCount,
          responses_count: responsesCount,
          no_contact_count: noContactCount,
          video_sent_count: videoSentCount,
          enrolled_count: enrolledCount,
          response_tags: responseTags,
          stage_tags: stageTagCounts,
          final_tag: finalLeadsTag,
          final_stage_tag: finalStageTag,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id,log_date',
        });

      if (upsertError) {
        console.error('Error upserting daily tracking log:', upsertError);
      }
    } catch (err) {
      console.error('Exception in logDailyTracking:', err);
    }
  }, [user]);

  return { logDailyTracking };
}
