import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface PostingTask {
  id: string;
  user_id: string;
  account_id: string | null;
  label: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export interface PostingLog {
  id: string;
  task_id: string;
  done_date: string;
  account_id: string | null;
}

function toLocalISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Daily posting checklist — tasks + per-day logs.
 * Optimistic UI on toggle/add/delete.
 */
export function usePostingTasks(selectedDate?: string) {
  const { user } = useAuth();
  const date = selectedDate || toLocalISO(new Date());
  const [tasks, setTasks] = useState<PostingTask[]>([]);
  const [logs, setLogs] = useState<PostingLog[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!user) { setTasks([]); setLogs([]); setLoading(false); return; }
    setLoading(true);
    const [tRes, lRes] = await Promise.all([
      supabase.from('posting_tasks' as any).select('*')
        .eq('user_id', user.id).eq('is_active', true)
        .order('sort_order', { ascending: true }).order('created_at', { ascending: true }),
      supabase.from('posting_logs' as any).select('*')
        .eq('user_id', user.id).eq('done_date', date),
    ]);
    if (tRes.error) console.error(tRes.error);
    if (lRes.error) console.error(lRes.error);
    setTasks(((tRes.data as any) || []) as PostingTask[]);
    setLogs(((lRes.data as any) || []) as PostingLog[]);
    setLoading(false);
  }, [user, date]);

  useEffect(() => { refetch(); }, [refetch]);

  const doneMap = useMemo(() => {
    const m = new Map<string, string>(); // task_id -> log_id
    logs.forEach((l) => m.set(l.task_id, l.id));
    return m;
  }, [logs]);

  const addTask = useCallback(async (label: string) => {
    const trimmed = label.trim();
    if (!trimmed || !user) return null;
    const max = tasks.reduce((acc, t) => Math.max(acc, t.sort_order), -1) + 1;
    const optimistic: PostingTask = {
      id: `temp-${Date.now()}`,
      user_id: user.id, account_id: null, label: trimmed,
      sort_order: max, is_active: true, created_at: new Date().toISOString(),
    };
    setTasks((p) => [...p, optimistic]);
    const { data, error } = await supabase.from('posting_tasks' as any).insert({
      user_id: user.id, label: trimmed, sort_order: max,
    }).select().single();
    if (error || !data) {
      setTasks((p) => p.filter((t) => t.id !== optimistic.id));
      toast.error('Could not add task');
      return null;
    }
    setTasks((p) => p.map((t) => t.id === optimistic.id ? (data as any) : t));
    return data as any;
  }, [user, tasks]);

  const deleteTask = useCallback(async (id: string) => {
    const prev = tasks;
    setTasks((p) => p.filter((t) => t.id !== id));
    const { error } = await supabase.from('posting_tasks' as any).delete().eq('id', id);
    if (error) { setTasks(prev); toast.error('Could not delete'); }
  }, [tasks]);

  const renameTask = useCallback(async (id: string, label: string) => {
    const trimmed = label.trim();
    if (!trimmed) return;
    const prev = tasks;
    setTasks((p) => p.map((t) => t.id === id ? { ...t, label: trimmed } : t));
    const { error } = await supabase.from('posting_tasks' as any).update({ label: trimmed }).eq('id', id);
    if (error) { setTasks(prev); toast.error('Could not rename'); }
  }, [tasks]);

  const toggle = useCallback(async (taskId: string) => {
    if (!user) return;
    const existingLogId = doneMap.get(taskId);
    if (existingLogId) {
      const prev = logs;
      setLogs((p) => p.filter((l) => l.id !== existingLogId));
      const { error } = await supabase.from('posting_logs' as any).delete().eq('id', existingLogId);
      if (error) { setLogs(prev); toast.error('Could not update'); }
    } else {
      const optimistic: PostingLog = {
        id: `temp-${Date.now()}`, task_id: taskId, done_date: date, account_id: null,
      };
      setLogs((p) => [...p, optimistic]);
      const { data, error } = await supabase.from('posting_logs' as any).insert({
        user_id: user.id, task_id: taskId, done_date: date,
      }).select().single();
      if (error || !data) {
        setLogs((p) => p.filter((l) => l.id !== optimistic.id));
        toast.error('Could not update');
      } else {
        setLogs((p) => p.map((l) => l.id === optimistic.id ? (data as any) : l));
      }
    }
  }, [user, date, doneMap, logs]);

  return { tasks, logs, doneMap, loading, addTask, deleteTask, renameTask, toggle, refetch };
}

/** Stats helper for Insights — last 7 days completion. */
export function usePostingWeeklyStats() {
  const { user } = useAuth();
  const [done, setDone] = useState(0);
  const [expected, setExpected] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!user) { setDone(0); setExpected(0); setLoading(false); return; }
      setLoading(true);
      const sevenAgo = new Date();
      sevenAgo.setHours(0, 0, 0, 0);
      sevenAgo.setDate(sevenAgo.getDate() - 6); // last 7 days inclusive
      const sinceIso = toLocalISO(sevenAgo);
      const [tRes, lRes] = await Promise.all([
        supabase.from('posting_tasks' as any).select('id', { count: 'exact', head: true })
          .eq('user_id', user.id).eq('is_active', true),
        supabase.from('posting_logs' as any).select('id', { count: 'exact', head: true })
          .eq('user_id', user.id).gte('done_date', sinceIso),
      ]);
      if (cancelled) return;
      const taskCount = tRes.count || 0;
      const logCount = lRes.count || 0;
      setDone(logCount);
      setExpected(taskCount * 7);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user]);

  const rate = expected > 0 ? Math.round((done / expected) * 100) : 0;
  return { done, expected, rate, loading };
}
