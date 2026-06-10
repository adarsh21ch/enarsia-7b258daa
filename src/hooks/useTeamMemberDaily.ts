/**
 * useTeamMemberDaily
 *
 * Per-member, per-day totals for a leader's downline within a month.
 * Powers the funnel-wise grid (member rows × day columns).
 *
 * Backed by public.get_team_member_daily(p_leader, p_month) which combines
 * personal_snapshot_v2 rows with prospect-derived rows so members in MANUAL
 * tracking mode still surface real numbers in the leader's view.
 */
import { useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface MemberDailyCell {
  member_user_id: string;
  date: string; // YYYY-MM-DD
  total_leads: number;
  total_responses: number;
}

export interface MemberDailyMap {
  /** key = `${userId}|${date}` → cell */
  byMemberDate: Map<string, MemberDailyCell>;
  /** key = userId → array of cells, sorted by date */
  byMember: Map<string, MemberDailyCell[]>;
  rows: MemberDailyCell[];
}

const EMPTY: MemberDailyMap = {
  byMemberDate: new Map(),
  byMember: new Map(),
  rows: [],
};

export function useTeamMemberDaily(
  leaderUserId: string | null | undefined,
  monthYear: string,
) {
  const { data: rawRows = [], isLoading, refetch } = useQuery({
    queryKey: ['team-member-daily', leaderUserId, monthYear],
    enabled: !!leaderUserId && !!monthYear,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc('get_team_member_daily', {
        p_leader: leaderUserId,
        p_month: monthYear,
      });
      if (error) {
        console.error('get_team_member_daily error', error);
        return [];
      }
      return data || [];
    },
  });

  const result: MemberDailyMap = useMemo(() => {
    if (!Array.isArray(rawRows) || rawRows.length === 0) return EMPTY;
    const byMemberDate = new Map<string, MemberDailyCell>();
    const byMember = new Map<string, MemberDailyCell[]>();
    const rows: MemberDailyCell[] = [];
    (rawRows as any[]).forEach((r) => {
      const cell: MemberDailyCell = {
        member_user_id: r.member_user_id,
        date: r.d,
        total_leads: Number(r.total_leads || 0),
        total_responses: Number(r.total_responses || 0),
      };
      rows.push(cell);
      byMemberDate.set(`${cell.member_user_id}|${cell.date}`, cell);
      const arr = byMember.get(cell.member_user_id) || [];
      arr.push(cell);
      byMember.set(cell.member_user_id, arr);
    });
    byMember.forEach((arr) => arr.sort((a, b) => a.date.localeCompare(b.date)));
    return { byMemberDate, byMember, rows };
  }, [rawRows]);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (!detail || detail.month === monthYear) refetch();
    };
    window.addEventListener('trackup:personal-snapshot-synced', handler);
    window.addEventListener('trackup:total-snapshot-synced', handler);
    return () => {
      window.removeEventListener('trackup:personal-snapshot-synced', handler);
      window.removeEventListener('trackup:total-snapshot-synced', handler);
    };
  }, [monthYear, refetch]);

  return { ...result, loading: isLoading, refetch };
}
