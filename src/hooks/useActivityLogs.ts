import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ActivityLog } from '@/types/prospect';
import { useAuth } from '@/contexts/AuthContext';

export function useActivityLogs(limit: number = 50) {
  const { user } = useAuth();
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchActivities = useCallback(async () => {
    if (!user) return;
    
    setLoading(true);
    const { data, error } = await supabase
      .from('activity_logs')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (!error && data) {
      setActivities(data as ActivityLog[]);
    }
    setLoading(false);
  }, [user, limit]);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  return { activities, loading, refetch: fetchActivities };
}
