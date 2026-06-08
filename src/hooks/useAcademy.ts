import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface AcademyTutorial {
  id: string;
  title: string;
  slug: string;
  description: string;
  video_url: string;
  thumbnail_url: string | null;
  category: string;
  order_index: number;
  duration_seconds: number;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

export interface AcademyCategory {
  category: string;
  label: string;
  order_index: number;
}

export interface TutorialProgress {
  completed: boolean;
  last_position_seconds: number;
}

export function useAcademyCategories() {
  const [categories, setCategories] = useState<AcademyCategory[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('academy_category_order' as any)
      .select('category,label,order_index')
      .order('order_index', { ascending: true });
    setCategories((data as any) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { categories, loading, refetch: load };
}

export function useAcademyTutorials(opts: { adminMode?: boolean } = {}) {
  const [tutorials, setTutorials] = useState<AcademyTutorial[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    let q = supabase
      .from('academy_tutorials' as any)
      .select('*')
      .order('category', { ascending: true })
      .order('order_index', { ascending: true });
    if (!opts.adminMode) q = q.eq('is_published', true);
    const { data } = await q;
    setTutorials((data as any) || []);
    setLoading(false);
  }, [opts.adminMode]);

  useEffect(() => {
    load();
  }, [load]);

  return { tutorials, loading, refetch: load };
}

/**
 * Per-user academy progress (resume position + completion).
 * Uses academy_completions table — extended with last_position_seconds + completed.
 */
export function useAcademyProgress() {
  const { user } = useAuth();
  const [progress, setProgress] = useState<Record<string, TutorialProgress>>({});
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const lastSavedAt = useRef<Record<string, number>>({});

  const load = useCallback(async () => {
    if (!user) {
      setProgress({});
      setCompletedIds(new Set());
      return;
    }
    const { data } = await supabase
      .from('academy_completions' as any)
      .select('tutorial_id,completed,last_position_seconds')
      .eq('user_id', user.id);
    const map: Record<string, TutorialProgress> = {};
    const done = new Set<string>();
    ((data as any) || []).forEach((r: any) => {
      map[r.tutorial_id] = {
        completed: !!r.completed,
        last_position_seconds: r.last_position_seconds || 0,
      };
      if (r.completed) done.add(r.tutorial_id);
    });
    setProgress(map);
    setCompletedIds(done);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const markComplete = useCallback(
    async (tutorialId: string) => {
      if (!user) return;
      setProgress((p) => ({
        ...p,
        [tutorialId]: { completed: true, last_position_seconds: p[tutorialId]?.last_position_seconds || 0 },
      }));
      setCompletedIds((s) => new Set(s).add(tutorialId));
      await supabase
        .from('academy_completions' as any)
        .upsert(
          {
            user_id: user.id,
            tutorial_id: tutorialId,
            completed: true,
            completed_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,tutorial_id' }
        );
    },
    [user]
  );

  const unmarkComplete = useCallback(
    async (tutorialId: string) => {
      if (!user) return;
      setCompletedIds((prev) => {
        const next = new Set(prev);
        next.delete(tutorialId);
        return next;
      });
      setProgress((p) => ({
        ...p,
        [tutorialId]: { completed: false, last_position_seconds: p[tutorialId]?.last_position_seconds || 0 },
      }));
      await supabase
        .from('academy_completions' as any)
        .upsert(
          { user_id: user.id, tutorial_id: tutorialId, completed: false },
          { onConflict: 'user_id,tutorial_id' }
        );
    },
    [user]
  );

  /** Throttled position save (every ~5s of playback). */
  const saveProgress = useCallback(
    async (tutorialId: string, seconds: number, durationSeconds: number) => {
      if (!user) return;
      const now = Date.now();
      const last = lastSavedAt.current[tutorialId] || 0;
      const reachedEnd =
        durationSeconds > 0 && seconds / durationSeconds >= 0.9;

      // throttle: skip if < 5s since last save, unless about to mark complete
      if (!reachedEnd && now - last < 5000) return;
      lastSavedAt.current[tutorialId] = now;

      const wasCompleted = !!progress[tutorialId]?.completed;
      const completed = wasCompleted || reachedEnd;

      setProgress((p) => ({
        ...p,
        [tutorialId]: { completed, last_position_seconds: Math.floor(seconds) },
      }));
      if (reachedEnd && !wasCompleted) {
        setCompletedIds((s) => new Set(s).add(tutorialId));
      }

      await supabase
        .from('academy_completions' as any)
        .upsert(
          {
            user_id: user.id,
            tutorial_id: tutorialId,
            last_position_seconds: Math.floor(seconds),
            completed,
            completed_at: completed ? new Date().toISOString() : null,
          },
          { onConflict: 'user_id,tutorial_id' }
        );
    },
    [user, progress]
  );

  return {
    progress,
    completedIds,
    markComplete,
    unmarkComplete,
    saveProgress,
    refetch: load,
  };
}

/** Back-compat alias for older code. */
export function useAcademyCompletions() {
  const { progress, completedIds, markComplete, unmarkComplete, refetch } = useAcademyProgress();
  return { progress, completedIds, markComplete, unmarkComplete, refetch };
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80);
}

export function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return '—';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}
