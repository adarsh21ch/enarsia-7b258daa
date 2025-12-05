import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ActivityLog } from '@/types/prospect';
import { useAuth } from '@/contexts/AuthContext';

// Activity types that should be excluded from ActionUp (pre-enrollment activities)
const EXCLUDED_ACTIVITY_TYPES = [
  'prospect_added',      // Adding new prospects (before enrollment)
  'bulk_import',         // Excel/CSV imports
  'data_import',         // Any data imports
  'prospect_created',    // Creating prospects
];

// Activity types that should be included in ActionUp (post-enrollment funnel activities)
const FUNNEL_ACTIVITY_TYPES = [
  'stage_change',        // Moving through funnel stages
  'enrollment',          // Enrollment events
  'action_change',       // Follow-up actions (calls, meetings, etc.)
  'note_added',          // Notes added to enrolled prospects
  'funnel_progress',     // Funnel progression events
  'follow_up',           // Follow-up activities
];

export function useActivityLogs(limit: number = 50, filterEnrolledOnly: boolean = true) {
  const { user } = useAuth();
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchActivities = useCallback(async () => {
    if (!user) return;
    
    setLoading(true);
    
    let query = supabase
      .from('activity_logs')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    // If filtering for enrolled-only activities (ActionUp view)
    if (filterEnrolledOnly) {
      // Exclude bulk import and prospect creation activities
      // Only include funnel-related activities
      query = query.in('activity_type', FUNNEL_ACTIVITY_TYPES);
    }

    const { data, error } = await query;

    if (!error && data) {
      // Additional client-side filtering for enrolled prospects only
      let filteredData = data as ActivityLog[];
      
      if (filterEnrolledOnly) {
        // Filter out any activities that might have slipped through
        filteredData = filteredData.filter(activity => {
          // Exclude any bulk/import related activities by description
          const description = activity.description?.toLowerCase() || '';
          if (
            description.includes('imported') ||
            description.includes('bulk') ||
            description.includes('excel') ||
            description.includes('csv')
          ) {
            return false;
          }
          return true;
        });
      }
      
      setActivities(filteredData);
    }
    setLoading(false);
  }, [user, limit, filterEnrolledOnly]);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  return { activities, loading, refetch: fetchActivities };
}

// Hook specifically for ActionUp - only shows enrolled prospect activities
export function useEnrolledActivityLogs(limit: number = 50) {
  return useActivityLogs(limit, true);
}

// Hook for all activities (including imports, new prospects, etc.)
export function useAllActivityLogs(limit: number = 50) {
  return useActivityLogs(limit, false);
}
