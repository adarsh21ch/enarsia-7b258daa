// Hook for user's recurring daily tasks (appear every day like leader compulsory actions)
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface UserDailyTask {
  id: string;
  title: string;
  is_active: boolean;
  sort_order: number;
}

interface UserDailyTaskWithStatus extends UserDailyTask {
  status: 'yes' | 'no' | null;
}

export function useUserDailyTasks(selectedDate: string) {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<UserDailyTask[]>([]);
  const [statuses, setStatuses] = useState<Record<string, 'yes' | 'no' | null>>({});
  const [loading, setLoading] = useState(true);

  // Fetch tasks and their status for the selected date
  const fetchTasks = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      // Fetch active tasks
      const { data: tasksData, error: tasksError } = await supabase
        .from('user_daily_tasks')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (tasksError) throw tasksError;

      // Fetch statuses for selected date
      const { data: statusData, error: statusError } = await supabase
        .from('user_daily_task_status')
        .select('task_id, status')
        .eq('user_id', user.id)
        .eq('date', selectedDate);

      if (statusError) throw statusError;

      // Build status map
      const statusMap: Record<string, 'yes' | 'no' | null> = {};
      statusData?.forEach(s => {
        statusMap[s.task_id] = s.status as 'yes' | 'no' | null;
      });

      setTasks(tasksData || []);
      setStatuses(statusMap);
    } catch (error) {
      console.error('Error fetching user daily tasks:', error);
    } finally {
      setLoading(false);
    }
  }, [user, selectedDate]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Tasks with status merged
  const tasksWithStatus: UserDailyTaskWithStatus[] = useMemo(() => {
    return tasks.map(task => ({
      ...task,
      status: statuses[task.id] || null
    }));
  }, [tasks, statuses]);

  // Add new recurring task
  const addTask = useCallback(async (title: string) => {
    if (!user || !title.trim()) return null;

    try {
      const maxOrder = tasks.length > 0 ? Math.max(...tasks.map(t => t.sort_order)) + 1 : 0;
      
      const { data, error } = await supabase
        .from('user_daily_tasks')
        .insert({
          user_id: user.id,
          title: title.trim(),
          sort_order: maxOrder
        })
        .select()
        .single();

      if (error) throw error;

      setTasks(prev => [...prev, data]);
      toast.success('Daily task added');
      return data;
    } catch (error) {
      console.error('Error adding task:', error);
      toast.error('Failed to add task');
      return null;
    }
  }, [user, tasks]);

  // Rename task
  const renameTask = useCallback(async (taskId: string, title: string) => {
    if (!user) return;
    const trimmed = title.trim();
    if (!trimmed) return;
    const prev = tasks;
    setTasks((p) => p.map((t) => (t.id === taskId ? { ...t, title: trimmed } : t)));
    try {
      const { error } = await supabase
        .from('user_daily_tasks')
        .update({ title: trimmed })
        .eq('id', taskId);
      if (error) throw error;
    } catch (error) {
      console.error('Error renaming task:', error);
      setTasks(prev);
      toast.error('Failed to rename task');
    }
  }, [user, tasks]);

  // Delete task
  const deleteTask = useCallback(async (taskId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('user_daily_tasks')
        .delete()
        .eq('id', taskId);

      if (error) throw error;

      setTasks(prev => prev.filter(t => t.id !== taskId));
      toast.success('Task removed');
    } catch (error) {
      console.error('Error deleting task:', error);
      toast.error('Failed to remove task');
    }
  }, [user]);

  // Mark task status for the day
  const markTask = useCallback(async (taskId: string, status: 'yes' | 'no' | null) => {
    if (!user) return;

    // Optimistic update
    setStatuses(prev => ({ ...prev, [taskId]: status }));

    try {
      if (status === null) {
        // Delete the status record
        await supabase
          .from('user_daily_task_status')
          .delete()
          .eq('user_id', user.id)
          .eq('task_id', taskId)
          .eq('date', selectedDate);
      } else {
        // Upsert the status
        const { error } = await supabase
          .from('user_daily_task_status')
          .upsert(
            {
              user_id: user.id,
              task_id: taskId,
              date: selectedDate,
              status: status
            },
            { onConflict: 'user_id,task_id,date' }
          );

        if (error) throw error;
      }
    } catch (error) {
      console.error('Error marking task:', error);
      // Revert on error
      fetchTasks();
      toast.error('Failed to update task');
    }
  }, [user, selectedDate, fetchTasks]);

  return {
    tasks: tasksWithStatus,
    loading,
    addTask,
    deleteTask,
    markTask,
    refetch: fetchTasks
  };
}
