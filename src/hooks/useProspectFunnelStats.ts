import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { FunnelStage } from '@/types/prospect';

export interface FunnelStats {
  enrollment: number;
  day_1: number;
  day_2: number;
  day_3: number;
  minimum_bill: number;
  level_up: number;
  two_cc: number;
}

const STAGE_MAPPING: Record<FunnelStage, keyof FunnelStats> = {
  'Enrollment': 'enrollment',
  'Day 1': 'day_1',
  'Day 2': 'day_2',
  'Day 3': 'day_3',
  'Minimum Bill': 'minimum_bill',
  'Level Up': 'level_up',
  '2CC': 'two_cc',
};

export function useProspectFunnelStats() {
  const [loading, setLoading] = useState(true);
  const [prospects, setProspects] = useState<{ funnel_stage: FunnelStage }[]>([]);
  const { user } = useAuth();

  const fetchData = useCallback(async () => {
    if (!user) return;
    
    setLoading(true);
    const { data, error } = await supabase
      .from('prospects')
      .select('funnel_stage')
      .eq('user_id', user.id);

    if (!error && data) {
      setProspects(data as { funnel_stage: FunnelStage }[]);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const totals = useMemo<FunnelStats>(() => {
    const counts: FunnelStats = {
      enrollment: 0,
      day_1: 0,
      day_2: 0,
      day_3: 0,
      minimum_bill: 0,
      level_up: 0,
      two_cc: 0,
    };

    prospects.forEach((p) => {
      if (p.funnel_stage && STAGE_MAPPING[p.funnel_stage]) {
        counts[STAGE_MAPPING[p.funnel_stage]]++;
      }
    });

    return counts;
  }, [prospects]);

  const totalProspects = prospects.length;

  return { totals, loading, totalProspects, refetch: fetchData };
}
