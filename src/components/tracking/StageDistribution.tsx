import { Prospect, FUNNEL_STAGES, FunnelStage } from '@/types/prospect';
import { StageBadge } from '@/components/prospects/StatusBadge';
import { useMemo } from 'react';
import { cn } from '@/lib/utils';

interface StageDistributionProps {
  prospects: Prospect[];
}

export function StageDistribution({ prospects }: StageDistributionProps) {
  const stageCounts = useMemo(() => {
    const counts: Record<FunnelStage, number> = {
      'Enrollment': 0,
      'Day 1': 0,
      'Day 2': 0,
      'Day 3': 0,
      'Minimum Bill': 0,
      'Level Up': 0,
    };
    prospects.forEach((p) => {
      counts[p.funnel_stage]++;
    });
    return counts;
  }, [prospects]);

  const maxCount = Math.max(...Object.values(stageCounts), 1);

  return (
    <div className="bg-card rounded-lg border border-border p-4 card-shadow">
      <h3 className="text-sm font-medium mb-4">Funnel Stage Distribution</h3>
      <div className="space-y-3">
        {FUNNEL_STAGES.map((stage) => {
          const count = stageCounts[stage];
          const percentage = (count / maxCount) * 100;
          
          return (
            <div key={stage} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <StageBadge stage={stage} />
                <span className="text-sm font-medium">{count}</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded-full transition-all duration-500',
                    stage === 'Enrollment' && 'bg-stage-enrollment',
                    stage === 'Day 1' && 'bg-stage-day1',
                    stage === 'Day 2' && 'bg-stage-day2',
                    stage === 'Day 3' && 'bg-stage-day3',
                    stage === 'Minimum Bill' && 'bg-stage-minimum',
                    stage === 'Level Up' && 'bg-stage-levelup',
                  )}
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
