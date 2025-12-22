// Hook for member to view and track daily tasks from leader's templates
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface DailyTaskItem {
  id: string; // template_item_id
  item_title: string;
  template_name: string;
  sort_order: number;
  status: 'yes' | 'no' | null; // null = not marked
  status_id?: string; // id in todo_daily_task_status (if exists)
}

interface LeaderInfo {
  leaderId: string;
  levelPosition: number;
}

export function useDailyTasks(selectedDate: string) {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<DailyTaskItem[]>([]);
  const [templateName, setTemplateName] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [leaderInfo, setLeaderInfo] = useState<LeaderInfo | null>(null);

  // Step 1: Resolve the user's effective leader and level
  const resolveLeaderAndLevel = useCallback(async () => {
    if (!user) return null;

    try {
      // Get user's profile to find their leader
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('leaders_id_of_my_leader, root_leader_id, level_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (profileError || !profile) return null;

      const leaderNeveraiId = profile.leaders_id_of_my_leader || profile.root_leader_id;
      if (!leaderNeveraiId) return null;

      // Get leader's user_id from their neverai_id
      const { data: leaderProfile, error: leaderError } = await supabase
        .from('profiles')
        .select('user_id')
        .ilike('neverai_id', leaderNeveraiId)
        .maybeSingle();

      if (leaderError || !leaderProfile) return null;

      // Get the user's level position
      let levelPosition = 1; // Default to level 1
      if (profile.level_id) {
        const { data: levelData } = await supabase
          .from('leader_levels')
          .select('position')
          .eq('id', profile.level_id)
          .maybeSingle();
        
        if (levelData) {
          levelPosition = levelData.position;
        }
      } else {
        // Get default level from leader
        const { data: defaultLevel } = await supabase
          .from('leader_levels')
          .select('position')
          .eq('leader_id', leaderProfile.user_id)
          .eq('is_default', true)
          .maybeSingle();
        
        if (defaultLevel) {
          levelPosition = defaultLevel.position;
        }
      }

      return {
        leaderId: leaderProfile.user_id,
        levelPosition
      };
    } catch (error) {
      console.error('Error resolving leader:', error);
      return null;
    }
  }, [user]);

  // Fetch template items and daily statuses
  const fetchDailyTasks = useCallback(async () => {
    if (!user) {
      setTasks([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // Resolve leader info if not already done
      let info = leaderInfo;
      if (!info) {
        info = await resolveLeaderAndLevel();
        setLeaderInfo(info);
      }

      if (!info) {
        // User has no leader, show empty
        setTasks([]);
        setTemplateName('');
        setLoading(false);
        return;
      }

      // Fetch template items for this leader + level
      // Include recurring (only_on_date is null) OR one-time items for the selected date
      const { data: templateItems, error: templateError } = await supabase
        .from('todo_template_items')
        .select('*')
        .eq('leader_id', info.leaderId)
        .eq('level_position', info.levelPosition)
        .eq('is_active', true)
        .or(`only_on_date.is.null,only_on_date.eq.${selectedDate}`)
        .order('sort_order', { ascending: true });

      if (templateError) throw templateError;

      if (!templateItems || templateItems.length === 0) {
        setTasks([]);
        setTemplateName('');
        setLoading(false);
        return;
      }

      // Get template name from first item
      setTemplateName(templateItems[0].template_name);

      // Fetch daily statuses for this date
      const templateItemIds = templateItems.map(t => t.id);
      const { data: statuses, error: statusError } = await supabase
        .from('todo_daily_task_status')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', selectedDate)
        .in('template_item_id', templateItemIds);

      if (statusError) throw statusError;

      // Map template items with their statuses
      const statusMap = new Map((statuses || []).map(s => [s.template_item_id, s]));
      
      const dailyTasks: DailyTaskItem[] = templateItems.map(item => {
        const status = statusMap.get(item.id);
        return {
          id: item.id,
          item_title: item.item_title,
          template_name: item.template_name,
          sort_order: item.sort_order,
          status: status?.status as 'yes' | 'no' | null,
          status_id: status?.id
        };
      });

      setTasks(dailyTasks);
    } catch (error) {
      console.error('Error fetching daily tasks:', error);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, [user, selectedDate, leaderInfo, resolveLeaderAndLevel]);

  useEffect(() => {
    fetchDailyTasks();
  }, [fetchDailyTasks]);

  // Mark a task as yes/no (upsert)
  const markTask = async (templateItemId: string, status: 'yes' | 'no' | null) => {
    if (!user) return false;

    // Optimistic update
    setTasks(prev => prev.map(t => 
      t.id === templateItemId ? { ...t, status } : t
    ));

    try {
      if (status === null) {
        // Delete the status row if setting to null (not marked)
        const task = tasks.find(t => t.id === templateItemId);
        if (task?.status_id) {
          const { error } = await supabase
            .from('todo_daily_task_status')
            .delete()
            .eq('id', task.status_id);
          
          if (error) throw error;
          setTasks(prev => prev.map(t => 
            t.id === templateItemId ? { ...t, status: null, status_id: undefined } : t
          ));
        }
      } else {
        // Upsert the status
        const { data, error } = await supabase
          .from('todo_daily_task_status')
          .upsert(
            {
              user_id: user.id,
              date: selectedDate,
              template_item_id: templateItemId,
              status: status
            },
            { onConflict: 'user_id,date,template_item_id' }
          )
          .select()
          .single();

        if (error) throw error;
        
        setTasks(prev => prev.map(t => 
          t.id === templateItemId ? { ...t, status, status_id: data.id } : t
        ));
      }
      
      return true;
    } catch (error) {
      console.error('Error marking task:', error);
      toast.error('Failed to save');
      // Revert optimistic update
      fetchDailyTasks();
      return false;
    }
  };

  return {
    tasks,
    templateName,
    loading,
    hasLeader: !!leaderInfo,
    markTask,
    refetch: fetchDailyTasks
  };
}
