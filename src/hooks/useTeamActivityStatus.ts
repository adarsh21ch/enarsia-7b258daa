/**
 * Activity Status for a leader's DIRECT downline on a given date (IST today by default).
 *
 * A member is "updated today" if EITHER:
 *   - a personal_snapshot_v2 row exists for them on the date, OR
 *   - their tracking_source_preferences.personal_source is APPLICATION or AUTO
 *     (auto-derived sources are treated as continuously updated).
 *
 * Uses the SECURITY DEFINER RPC `get_team_activity_status` so this works for
 * both direct downline (caller=leader) AND grand-downline drill-down
 * (caller is an upline ancestor of `leaderUserId`).
 */
import { useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface TeamActivityRow {
  user_id: string;
  display_name: string | null;
  email: string | null;
  has_personal_snapshot: boolean;
  personal_source: 'APPLICATION' | 'AUTO' | 'MANUAL' | null;
  updated: boolean;
  reason: 'snapshot' | 'auto_source' | null;
}

/** Today in IST (UTC+5:30) as YYYY-MM-DD */
export function todayIST(): string {
  const now = new Date();
  const ist = new Date(now.getTime() + (now.getTimezoneOffset() + 330) * 60 * 1000);
  const y = ist.getFullYear();
  const m = String(ist.getMonth() + 1).padStart(2, '0');
  const d = String(ist.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

interface Return {
  rows: TeamActivityRow[];
  updatedCount: number;
  totalCount: number;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useTeamActivityStatus(
  leaderUserId: string | undefined | null,
  date: string = todayIST(),
): Return {
  const [rows, setRows] = useState<TeamActivityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!leaderUserId) {
      setRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data, error: rpcErr } = await supabase.rpc('get_team_activity_status', {
        _leader_user_id: leaderUserId,
        _date: date,
      });
      if (rpcErr) throw rpcErr;
      const mapped: TeamActivityRow[] = (data || []).map((r: any) => {
        const src = (r.personal_source ?? null) as TeamActivityRow['personal_source'];
        const isAuto = src === 'APPLICATION' || src === 'AUTO';
        const reason: TeamActivityRow['reason'] =
          r.has_personal_snapshot ? 'snapshot' : isAuto ? 'auto_source' : null;
        return {
          user_id: r.user_id,
          display_name: r.display_name,
          email: r.email,
          has_personal_snapshot: !!r.has_personal_snapshot,
          personal_source: src,
          updated: !!r.has_personal_snapshot || isAuto,
          reason,
        };
      });
      setRows(mapped);
    } catch (err: any) {
      console.error('[useTeamActivityStatus]', err);
      setError(err?.message || 'Failed to load activity status');
    } finally {
      setLoading(false);
    }
  }, [leaderUserId, date]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const { updatedCount, totalCount } = useMemo(() => ({
    updatedCount: rows.filter(r => r.updated).length,
    totalCount: rows.length,
  }), [rows]);

  return { rows, updatedCount, totalCount, loading, error, refresh: fetchData };
}
