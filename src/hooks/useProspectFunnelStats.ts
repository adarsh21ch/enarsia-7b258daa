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

const FIVE_MINUTES_MS = 5 * 60 * 1000;

export function useProspectFunnelStats() {
  const [loading, setLoading] = useState(true);
  const [totalProspects, setTotalProspects] = useState(0);
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
      // Fetch all prospects with their funnel_stage and timestamp
      const { data, error } = await supabase
        .from('prospects')
        .select('funnel_stage, funnel_stage_at')
        .eq('user_id', user.id);

      if (error) {
        console.error('Error fetching funnel stats:', error);
        setLoading(false);
        return;
      }

      const prospects = data || [];
      setTotalProspects(prospects.length);
      const now = new Date();

      // Count prospects per funnel stage (only if confirmed after 5 minutes)
      const stats: FunnelStats = {
        enrollment: 0,
        day_1: 0,
        day_2: 0,
        day_3: 0,
        minimum_bill: 0,
        level_up: 0,
        two_cc: 0,
      };

      prospects.forEach((p) => {
        const stage = p.funnel_stage;
        if (stage && STAGE_MAP[stage]) {
          // Apply 5-minute confirmation rule
          const stageAt = p.funnel_stage_at ? new Date(p.funnel_stage_at) : null;
          const isConfirmed = !stageAt || (now.getTime() - stageAt.getTime() >= FIVE_MINUTES_MS);
          
          if (isConfirmed) {
            stats[STAGE_MAP[stage]]++;
          }
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

  return { totals, loading, totalProspects, refetch: fetchData };
}
