import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ActivityLog } from '@/types/prospect';
import { useAuth } from '@/contexts/AuthContext';

export function useActivityLogs(limit: number = 50) {
  const { user } = useAuth();
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchActivities = useCallback(async () => {
    if (!user) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const { data, error: queryError } = await supabase
        .from('activity_logs')
        .select('id, activity_type, description, created_at, prospect_id, new_value, old_value')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (queryError) {
        setError('Failed to load activities');
        console.error('Activity logs query error:', queryError);
      } else if (data) {
        setActivities(data as ActivityLog[]);
      }
    } catch (err) {
      setError('Failed to load activities');
      console.error('Activity logs fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [user, limit]);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  return { activities, loading, error, refetch: fetchActivities };
}
