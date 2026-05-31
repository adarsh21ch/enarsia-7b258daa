import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import type { ContentCategory } from '@/hooks/useContentCategories';

function storageKey(userId: string | undefined) {
  return `creator:catOrder:${userId || 'anon'}`;
}

export function useCategoryOrder(categories: ContentCategory[]) {
  const { user } = useAuth();
  const key = storageKey(user?.id);
  const [order, setOrder] = useState<string[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      setOrder(raw ? JSON.parse(raw) : []);
    } catch { setOrder([]); }
  }, [key]);

  const ordered = useMemo(() => {
    const byId = new Map(categories.map((c) => [c.id, c]));
    const known = order.filter((id) => byId.has(id)).map((id) => byId.get(id)!);
    const seen = new Set(known.map((c) => c.id));
    const rest = categories.filter((c) => !seen.has(c.id));
    return [...known, ...rest];
  }, [categories, order]);

  const persist = useCallback((next: string[]) => {
    setOrder(next);
    try { localStorage.setItem(key, JSON.stringify(next)); } catch {}
  }, [key]);

  const move = useCallback((id: string, dir: -1 | 1) => {
    const ids = ordered.map((c) => c.id);
    const i = ids.indexOf(id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    persist(ids);
  }, [ordered, persist]);

  return { ordered, move };
}
