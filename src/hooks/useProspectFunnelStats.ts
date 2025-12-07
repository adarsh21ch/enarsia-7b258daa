import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface FunnelStats {
  enrollment: number;
  day_1: number;
  day_2: number;
  day_3: number;
  minimum_bill: number;
  level_up: number;
  two_cc: number;
}

export interface ProspectWithDate {
  funnel_stage: string | null;
  date_added: string;
}

// Map database funnel_stage values to stat keys
const STAGE_MAP: Record<string, keyof FunnelStats> = {
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
  const [totalProspects, setTotalProspects] = useState(0);
  const [prospects, setProspects] = useState<ProspectWithDate[]>([]);
  const [totals, setTotals] = useState<FunnelStats>({
    enrollment: 0,
    day_1: 0,
    day_2: 0,
    day_3: 0,
    minimum_bill: 0,
    level_up: 0,
    two_cc: 0,
  });
  const { user } = useAuth();

  const fetchData = useCallback(async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Fetch all prospects with funnel_stage and date_added
      const { data, error } = await supabase
        .from('prospects')
        .select('funnel_stage, date_added')
        .eq('user_id', user.id);

      if (error) {
        console.error('Error fetching funnel stats:', error);
        setLoading(false);
        return;
      }

      const prospectData = data || [];
      setProspects(prospectData);
      setTotalProspects(prospectData.length);

      // Count prospects per funnel stage
      const stats: FunnelStats = {
        enrollment: 0,
        day_1: 0,
        day_2: 0,
        day_3: 0,
        minimum_bill: 0,
        level_up: 0,
        two_cc: 0,
      };

      prospectData.forEach((p) => {
        const stage = p.funnel_stage;
        if (stage && STAGE_MAP[stage]) {
          stats[STAGE_MAP[stage]]++;
        }
      });

      setTotals(stats);
    } catch (err) {
      console.error('Error in fetchData:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { totals, loading, totalProspects, prospects, refetch: fetchData };
}
