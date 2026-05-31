import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useContentCategories } from './useContentCategories';

const db = supabase as unknown as { from: (t: string) => any };

export interface NevInsights {
  // Card 1 — best format
  bestFormat: { format: string; count: number } | null;
  postedCount: number;
  // Card 2 — untapped topics
  untappedTopCategory: { name: string; count: number } | null;
  untappedTotal: number;
  // Card 3 — consistency
  consistencyDays: number; // 0..30
}

export function useNevInsights(accountId?: string | null) {
  const { user } = useAuth();
  const { categories } = useContentCategories();
  const qc = useQueryClient();
  const key = ['nev_insights', user?.id, accountId ?? 'all'];

  const query = useQuery<NevInsights>({
    queryKey: key,
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5,
    queryFn: async () => {
      const empty: NevInsights = {
        bestFormat: null,
        postedCount: 0,
        untappedTopCategory: null,
        untappedTotal: 0,
        consistencyDays: 0,
      };
      if (!user) return empty;

      let piecesQ = db.from('content_pieces').select('platform,stage,posted_date').eq('user_id', user.id);
      if (accountId) piecesQ = piecesQ.eq('account_id', accountId);
      const { data: pieces = [] } = await piecesQ;

      let ideasQ = db.from('content_ideas').select('status,category_id,created_at').eq('user_id', user.id);
      if (accountId) ideasQ = ideasQ.eq('account_id', accountId);
      const { data: ideas = [] } = await ideasQ;

      // Card 1 — most-posted format (proxy for "best" until views are captured)
      const posted = (pieces as any[]).filter((p) => p.stage === 'posted');
      let bestFormat: NevInsights['bestFormat'] = null;
      if (posted.length >= 3) {
        const counts = new Map<string, number>();
        for (const p of posted) {
          const fmt = (p.platform || 'reels') as string;
          counts.set(fmt, (counts.get(fmt) || 0) + 1);
        }
        const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
        if (top) bestFormat = { format: top[0], count: top[1] };
      }

      // Card 2 — ideas not done sitting 7+ days
      const sevenAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      const stale = (ideas as any[]).filter(
        (i) => (i.status ?? 'idea') !== 'done' && new Date(i.created_at).getTime() <= sevenAgo,
      );
      const byCat = new Map<string | null, number>();
      for (const i of stale) byCat.set(i.category_id ?? null, (byCat.get(i.category_id ?? null) || 0) + 1);
      const topCat = [...byCat.entries()].sort((a, b) => b[1] - a[1])[0];
      const untappedTopCategory = topCat
        ? {
            name: topCat[0] ? categories.find((c) => c.id === topCat[0])?.name || 'Uncategorized' : 'Uncategorized',
            count: topCat[1],
          }
        : null;

      // Card 3 — distinct posted_date in last 30 days
      const thirtyAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
      const distinct = new Set<string>();
      for (const p of pieces as any[]) {
        if (!p.posted_date) continue;
        if (new Date(p.posted_date).getTime() >= thirtyAgo) distinct.add(p.posted_date);
      }

      return {
        bestFormat,
        postedCount: posted.length,
        untappedTopCategory,
        untappedTotal: stale.length,
        consistencyDays: Math.min(30, distinct.size),
      };
    },
  });

  return {
    ...query,
    refresh: () => qc.invalidateQueries({ queryKey: ['nev_insights', user?.id] }),
  };
}
