/**
 * Compulsory-actions completion grid for a leader's direct downline.
 *
 * For a given (leaderUserId, levelPosition, date) it returns:
 *   - active template items the leader defined for that level
 *   - per-member status (yes / no / null) for each template item on that date
 *
 * Members are supplied by the caller (already discovered via useLeaderTeamMembers
 * with dual-key rules). Read-only — writes happen in useDailyTasks for the
 * member, or useTodoTemplates for the leader.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface CompulsoryItem {
  id: string;
  item_title: string;
  sort_order: number;
  only_on_date: string | null;
}

export type CompulsoryStatus = 'yes' | 'no' | null;

export interface MemberStatusRow {
  user_id: string;
  statuses: Record<string, CompulsoryStatus>; // template_item_id -> status
  yesCount: number;
  totalCount: number;
}

interface Return {
  items: CompulsoryItem[];
  statusByMember: Map<string, MemberStatusRow>;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useTeamCompulsoryGrid(
  leaderUserId: string | null | undefined,
  levelPosition: number | null,
  memberIds: string[],
  date: string,
): Return {
  const [items, setItems] = useState<CompulsoryItem[]>([]);
  const [statusByMember, setStatusByMember] = useState<Map<string, MemberStatusRow>>(new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const memberKey = useMemo(() => memberIds.slice().sort().join(','), [memberIds]);

  const fetchData = useCallback(async () => {
    if (!leaderUserId || levelPosition === null) {
      setItems([]);
      setStatusByMember(new Map());
      return;
    }

    setLoading(true);
    setError(null);
    try {
      // 1) Template items for this leader+level, active, applicable to `date`
      const { data: tmpl, error: tErr } = await supabase
        .from('todo_template_items')
        .select('id, item_title, sort_order, only_on_date')
        .eq('leader_id', leaderUserId)
        .eq('level_position', levelPosition)
        .eq('is_active', true)
        .or(`only_on_date.is.null,only_on_date.eq.${date}`)
        .order('sort_order', { ascending: true });

      if (tErr) throw tErr;

      const tItems: CompulsoryItem[] = (tmpl || []) as CompulsoryItem[];
      setItems(tItems);

      if (tItems.length === 0 || memberIds.length === 0) {
        setStatusByMember(new Map());
        return;
      }

      // 2) Statuses for all members × items × date
      const itemIds = tItems.map(i => i.id);
      const { data: statuses, error: sErr } = await supabase
        .from('todo_daily_task_status')
        .select('user_id, template_item_id, status')
        .in('user_id', memberIds)
        .in('template_item_id', itemIds)
        .eq('date', date);

      if (sErr) throw sErr;

      const map = new Map<string, MemberStatusRow>();
      memberIds.forEach(uid => {
        map.set(uid, {
          user_id: uid,
          statuses: {},
          yesCount: 0,
          totalCount: tItems.length,
        });
      });
      (statuses || []).forEach((row: any) => {
        const entry = map.get(row.user_id);
        if (!entry) return;
        const s = (row.status as CompulsoryStatus) ?? null;
        entry.statuses[row.template_item_id] = s;
        if (s === 'yes') entry.yesCount += 1;
      });
      setStatusByMember(map);
    } catch (err: any) {
      console.error('[useTeamCompulsoryGrid] error', err);
      setError(err?.message || 'Failed to load compulsory actions');
    } finally {
      setLoading(false);
    }
  }, [leaderUserId, levelPosition, memberKey, date]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchData(); }, [fetchData]);

  return { items, statusByMember, loading, error, refresh: fetchData };
}
