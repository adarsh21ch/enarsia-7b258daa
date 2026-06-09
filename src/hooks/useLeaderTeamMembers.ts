/**
 * Discover a leader's DIRECT downline using the DUAL-KEY rule:
 *   profile is a direct downline of X if:
 *     - profile.upline_email = X.email  (new path), OR
 *     - profile.leaders_id_of_my_leader = X.neverai_id  (legacy path)
 *   AND profile.allow_leader_to_view = true
 *
 * Returns members with their level info, so the team-tracking sidebar can group by level.
 *
 * Backed by react-query so multiple consumers on different pages
 * (Profile menu badge, Tracking header badge, /team-tracking page) share
 * a single cached fetch. staleTime = 5 min so flipping between tabs does
 * not re-query.
 */
import { useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface LeaderLevel {
  id: string;
  leader_id: string;
  label: string;
  code: string | null;
  position: number;
}

export interface TeamMemberProfile {
  user_id: string;
  display_name: string | null;
  email: string | null;
  neverai_id: string | null;
  upline_email: string | null;
  leaders_id_of_my_leader: string | null;
  level_id: string | null;
  level_position: number | null;
  allow_leader_to_view: boolean;
}

interface UseLeaderTeamMembersReturn {
  members: TeamMemberProfile[];
  memberIds: string[];
  levels: LeaderLevel[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
  getMembersByLevel: (levelId: string | null) => TeamMemberProfile[];
}

interface FetchResult {
  members: TeamMemberProfile[];
  levels: LeaderLevel[];
}

const EMPTY_MEMBERS: TeamMemberProfile[] = [];
const EMPTY_LEVELS: LeaderLevel[] = [];

export function useLeaderTeamMembers(
  leaderUserId: string | undefined | null,
  leaderEmail: string | undefined | null,
  leaderNeveraiId: string | undefined | null,
): UseLeaderTeamMembersReturn {
  const enabled = !!leaderUserId && !!(leaderEmail || leaderNeveraiId);

  const { data, isLoading, error, refetch } = useQuery<FetchResult, Error>({
    queryKey: [
      'leader-team-members',
      leaderUserId ?? null,
      (leaderEmail ?? '').toLowerCase(),
      leaderNeveraiId ?? null,
    ],
    enabled,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    queryFn: async (): Promise<FetchResult> => {
      // Leader's own levels (so we can show level groups)
      const { data: lvlRows, error: lvlErr } = await supabase
        .from('leader_levels')
        .select('id, leader_id, label, code, position')
        .eq('leader_id', leaderUserId!)
        .order('position', { ascending: true });

      if (lvlErr) throw lvlErr;

      const fetchedLevels: LeaderLevel[] = (lvlRows || []) as unknown as LeaderLevel[];
      const levelPosMap = new Map(fetchedLevels.map(l => [l.id, l.position]));

      // Dual-key OR query — supports both email and legacy neverai_id connections
      const orParts: string[] = [];
      if (leaderEmail) orParts.push(`upline_email.eq.${leaderEmail.toLowerCase()}`);
      if (leaderNeveraiId) orParts.push(`leaders_id_of_my_leader.eq.${leaderNeveraiId}`);

      let query = supabase
        .from('profiles')
        .select('user_id, display_name, email, neverai_id, upline_email, leaders_id_of_my_leader, level_id, allow_leader_to_view')
        .eq('allow_leader_to_view', true);

      if (orParts.length > 0) query = query.or(orParts.join(','));

      const { data: rows, error: memErr } = await query;
      if (memErr) throw memErr;

      const out: TeamMemberProfile[] = (rows || []).map((p: any) => ({
        user_id: p.user_id,
        display_name: p.display_name,
        email: p.email,
        neverai_id: p.neverai_id,
        upline_email: p.upline_email,
        leaders_id_of_my_leader: p.leaders_id_of_my_leader,
        level_id: p.level_id,
        level_position: p.level_id ? levelPosMap.get(p.level_id) ?? null : null,
        allow_leader_to_view: p.allow_leader_to_view,
      }));

      return { members: out, levels: fetchedLevels };
    },
  });

  const members = useMemo(() => data?.members ?? EMPTY_MEMBERS, [data]);
  const levels = useMemo(() => data?.levels ?? EMPTY_LEVELS, [data]);

  const memberIds = useMemo(() => members.map(m => m.user_id), [members]);

  const getMembersByLevel = useCallback((levelId: string | null) => {
    if (levelId === null) return members;
    return members.filter(m => m.level_id === levelId);
  }, [members]);

  const refresh = useCallback(() => { void refetch(); }, [refetch]);

  return {
    members,
    memberIds,
    levels,
    loading: enabled ? isLoading : false,
    error: error ? (error.message || 'Failed to fetch team members') : null,
    refresh,
    getMembersByLevel,
  };
}
