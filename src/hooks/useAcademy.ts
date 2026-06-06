import { useEffect, useState, useCallback } from 'react';
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

export function useAcademyCompletions() {
  const { user } = useAuth();
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    if (!user) {
      setCompletedIds(new Set());
      return;
    }
    const { data } = await supabase
      .from('academy_completions' as any)
      .select('tutorial_id')
      .eq('user_id', user.id);
    setCompletedIds(new Set(((data as any) || []).map((r: any) => r.tutorial_id)));
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const markComplete = useCallback(
    async (tutorialId: string) => {
      if (!user) return;
      await supabase
        .from('academy_completions' as any)
        .upsert({ user_id: user.id, tutorial_id: tutorialId });
      setCompletedIds((prev) => new Set(prev).add(tutorialId));
    },
    [user]
  );

  const unmarkComplete = useCallback(
    async (tutorialId: string) => {
      if (!user) return;
      await supabase
        .from('academy_completions' as any)
        .delete()
        .eq('user_id', user.id)
        .eq('tutorial_id', tutorialId);
      setCompletedIds((prev) => {
        const next = new Set(prev);
        next.delete(tutorialId);
        return next;
      });
    },
    [user]
  );

  return { completedIds, markComplete, unmarkComplete, refetch: load };
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
