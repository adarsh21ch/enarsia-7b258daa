import { useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Leader-scoped "starred" team members. Backed by `member_priority` table.
 * RLS scopes everything to auth.uid() = leader_id.
 */
export function useMemberPriority() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const leaderId = user?.id ?? null;

  const { data: priorityIds = [], isLoading } = useQuery({
    queryKey: ['member-priority', leaderId],
    enabled: !!leaderId,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('member_priority')
        .select('member_user_id')
        .eq('leader_id', leaderId!);
      if (error) {
        console.error('member_priority fetch', error);
        return [] as string[];
      }
      return (data ?? []).map((r: any) => r.member_user_id as string);
    },
  });

  const prioritySet = useMemo(() => new Set(priorityIds), [priorityIds]);

  const toggle = useCallback(async (memberUserId: string) => {
    if (!leaderId) return;
    const isPriority = prioritySet.has(memberUserId);
    if (isPriority) {
      await supabase
        .from('member_priority')
        .delete()
        .eq('leader_id', leaderId)
        .eq('member_user_id', memberUserId);
    } else {
      await supabase
        .from('member_priority')
        .insert({ leader_id: leaderId, member_user_id: memberUserId });
    }
    qc.invalidateQueries({ queryKey: ['member-priority', leaderId] });
  }, [leaderId, prioritySet, qc]);

  return { priorityIds, prioritySet, toggle, loading: isLoading };
}
