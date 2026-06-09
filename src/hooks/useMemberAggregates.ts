/**
 * Aggregate per-member totals for a date range from total_snapshot_v2 (default)
 * or personal_snapshot_v2. Used by CompareColumns to show side-by-side numbers
 * for multiple downline members.
 *
 * RLS: leader can read direct downline's snapshots via existing policies
 * (auth.uid() = upline_leader_id). Grand-downline is NOT included here — by
 * design, Compare operates on the currently-visible team.
 */
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { slotKeysToTagNames, hasSlotKeys } from '@/lib/snapshotSlotUtils';

export interface MemberAggregate {
  userId: string;
  totalLeads: number;
  totalResponses: number;
  finalTagCount: number;
  responseTags: Record<string, number>;
  stageTags: Record<string, number>;
  daysWithData: number;
}

interface Args {
  memberIds: string[];
  monthStart: string; // YYYY-MM-DD
  monthEnd: string;
  responseTagNames: string[];
  stageTagNames: string[];
  source: 'personal' | 'total';
}

export function useMemberAggregates({
  memberIds, monthStart, monthEnd, responseTagNames, stageTagNames, source,
}: Args) {
  const [data, setData] = useState<Map<string, MemberAggregate>>(new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (memberIds.length === 0) {
      setData(new Map());
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const table = source === 'total' ? 'total_snapshot_v2' : 'personal_snapshot_v2';
        const { data: rows, error: err } = await supabase
          .from(table)
          .select('user_id, date, total_leads, total_responses, final_tag_count, response_tags, stage_tags')
          .in('user_id', memberIds)
          .gte('date', monthStart)
          .lte('date', monthEnd);
        if (err) throw err;

        const agg = new Map<string, MemberAggregate>();
        memberIds.forEach(id => agg.set(id, {
          userId: id, totalLeads: 0, totalResponses: 0, finalTagCount: 0,
          responseTags: Object.fromEntries(responseTagNames.map(n => [n, 0])),
          stageTags: Object.fromEntries(stageTagNames.map(n => [n, 0])),
          daysWithData: 0,
        }));

        (rows || []).forEach((r: any) => {
          const cur = agg.get(r.user_id);
          if (!cur) return;
          cur.totalLeads += r.total_leads || 0;
          cur.totalResponses += r.total_responses || 0;
          cur.finalTagCount += r.final_tag_count || 0;
          cur.daysWithData += 1;

          const rt: Record<string, number> = r.response_tags || {};
          const st: Record<string, number> = r.stage_tags || {};
          const rtMapped = hasSlotKeys(rt, 'response_tag')
            ? slotKeysToTagNames(responseTagNames, rt, 'response_tag')
            : rt;
          const stMapped = hasSlotKeys(st, 'stage_tag')
            ? slotKeysToTagNames(stageTagNames, st, 'stage_tag')
            : st;
          responseTagNames.forEach(n => { cur.responseTags[n] += rtMapped[n] || 0; });
          stageTagNames.forEach(n => { cur.stageTags[n] += stMapped[n] || 0; });
        });

        if (!cancelled) setData(agg);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Failed to load aggregates');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [memberIds.join(','), monthStart, monthEnd, responseTagNames.join(','), stageTagNames.join(','), source]);

  return { data, loading, error };
}
