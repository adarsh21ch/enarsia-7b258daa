import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { differenceInDays, parseISO, format } from 'date-fns';

export interface FunnelStats {
  enrollment: number;
  day_1: number;
  day_2: number;
  day_3: number;
  minimum_bill: number;
  level_up: number;
  two_cc: number;
}

export interface FunnelRowStats extends FunnelStats {
  funnel_number: number;
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

// 5-second confirmation window
const FIVE_SECONDS_MS = 5 * 1000;

// Define stage order for cumulative counting (later stages include all earlier stages)
const STAGE_ORDER: (keyof FunnelStats)[] = ['enrollment', 'day_1', 'day_2', 'day_3', 'minimum_bill', 'level_up', 'two_cc'];

// Get all stages that should be counted when a prospect is at a given stage
function getCumulativeStages(stage: keyof FunnelStats): (keyof FunnelStats)[] {
  const stageIndex = STAGE_ORDER.indexOf(stage);
  if (stageIndex === -1) return [stage];
  // Return all stages from enrollment up to and including this stage
  return STAGE_ORDER.slice(0, stageIndex + 1);
}

interface FunnelConfig {
  day_1_start: string;
  funnel_length: number;
}

export function useProspectFunnelStats(funnelConfig?: FunnelConfig | null) {
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
  const [funnelRows, setFunnelRows] = useState<FunnelRowStats[]>([]);
  const { user } = useAuth();

  const fetchData = useCallback(async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Fetch all prospects with their funnel_stage and timestamp
      const { data, error } = await supabase
        .from('prospects')
        .select('id, funnel_stage, funnel_stage_at, date_added')
        .eq('user_id', user.id);

      if (error) {
        console.error('Error fetching funnel stats:', error);
        setLoading(false);
        return;
      }

      const prospects = data || [];
      setTotalProspects(prospects.length);
      const now = new Date();

      // Overall totals with cumulative counting
      const stats: FunnelStats = {
        enrollment: 0,
        day_1: 0,
        day_2: 0,
        day_3: 0,
        minimum_bill: 0,
        level_up: 0,
        two_cc: 0,
      };

      // Auto-generate funnel rows based on config
      const funnelRowsMap: Record<number, FunnelStats> = {};
      
      prospects.forEach((p) => {
        const stage = p.funnel_stage;
        if (stage && STAGE_MAP[stage]) {
          // Apply 5-second confirmation rule
          const stageAt = p.funnel_stage_at ? new Date(p.funnel_stage_at) : null;
          const isConfirmed = !stageAt || (now.getTime() - stageAt.getTime() >= FIVE_SECONDS_MS);
          
          if (isConfirmed) {
            // Cumulative counting: count this prospect in all stages up to their current stage
            const currentStageKey = STAGE_MAP[stage];
            const cumulativeStages = getCumulativeStages(currentStageKey);
            cumulativeStages.forEach((stageKey) => {
              stats[stageKey]++;
            });

            // Calculate funnel number based on config if provided
            if (funnelConfig && funnelConfig.day_1_start && p.date_added) {
              const startDate = parseISO(funnelConfig.day_1_start);
              const prospectDate = parseISO(p.date_added.split('T')[0]);
              const daysDiff = differenceInDays(prospectDate, startDate);
              
              if (daysDiff >= 0) {
                const funnelNumber = Math.floor(daysDiff / funnelConfig.funnel_length) + 1;
                
                if (!funnelRowsMap[funnelNumber]) {
                  funnelRowsMap[funnelNumber] = {
                    enrollment: 0,
                    day_1: 0,
                    day_2: 0,
                    day_3: 0,
                    minimum_bill: 0,
                    level_up: 0,
                    two_cc: 0,
                  };
                }
                
                // Add to funnel row with cumulative counting
                cumulativeStages.forEach((stageKey) => {
                  funnelRowsMap[funnelNumber][stageKey]++;
                });
              }
            }
          }
        }
      });

      setTotals(stats);

      // Convert funnel rows map to array sorted by funnel number
      const sortedFunnelRows: FunnelRowStats[] = Object.entries(funnelRowsMap)
        .map(([num, rowStats]) => ({
          funnel_number: parseInt(num),
          ...rowStats,
        }))
        .sort((a, b) => a.funnel_number - b.funnel_number);

      setFunnelRows(sortedFunnelRows);
    } catch (err) {
      console.error('Error in fetchData:', err);
    } finally {
      setLoading(false);
    }
  }, [user, funnelConfig]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { totals, loading, totalProspects, funnelRows, refetch: fetchData };
}
