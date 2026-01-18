import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function useActivityLog() {
  const { user } = useAuth();

  const logActivity = useCallback(async (
    activityType: string,
    description: string,
    prospectId?: string,
    oldValue?: string,
    newValue?: string
  ) => {
    if (!user) return;

    try {
      await supabase
        .from('activity_logs')
        .insert({
          user_id: user.id,
          prospect_id: prospectId || null,
          activity_type: activityType,
          description,
          old_value: oldValue || null,
          new_value: newValue || null,
        });
    } catch (error) {
      console.error('Error logging activity:', error);
    }
  }, [user]);

  // Log bulk activities (import/delete) as a single summarized entry
  const logBulkActivity = useCallback(async (
    activityType: 'bulk_import' | 'bulk_delete',
    count: number
  ) => {
    if (!user || count === 0) return;

    const description = activityType === 'bulk_import' 
      ? `Imported ${count} leads`
      : `Deleted ${count} leads`;

    try {
      await supabase
        .from('activity_logs')
        .insert({
          user_id: user.id,
          prospect_id: null,
          activity_type: activityType,
          description,
          old_value: null,
          new_value: String(count),
        });
    } catch (error) {
      console.error('Error logging bulk activity:', error);
    }
  }, [user]);

  return { logActivity, logBulkActivity };
}
