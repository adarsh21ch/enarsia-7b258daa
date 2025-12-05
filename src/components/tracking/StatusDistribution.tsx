import { Prospect, STATUSES, ProspectStatus } from '@/types/prospect';
import { StatusBadge } from '@/components/prospects/StatusBadge';
import { useMemo } from 'react';

interface StatusDistributionProps {
  prospects: Prospect[];
}

export function StatusDistribution({ prospects }: StatusDistributionProps) {
  const statusCounts = useMemo(() => {
    const counts: Record<ProspectStatus | 'None', number> = {
      'Good': 0,
      'Medium': 0,
      'Bad': 0,
      'None': 0,
    };
    prospects.forEach((p) => {
      if (p.prospect_status && counts[p.prospect_status] !== undefined) {
        counts[p.prospect_status]++;
      } else {
        counts['None']++;
      }
    });
    return counts;
  }, [prospects]);

  const total = prospects.length || 1;

  return (
    <div className="bg-card rounded-lg border border-border p-4 card-shadow">
      <h3 className="text-sm font-medium mb-4">Status Distribution</h3>
      <div className="space-y-3">
        {STATUSES.map((status) => {
          const count = statusCounts[status];
          const percentage = (count / total) * 100;
          
          return (
            <div key={status} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <StatusBadge status={status} />
                <span className="text-xs text-muted-foreground">
                  {percentage.toFixed(0)}%
                </span>
              </div>
              <span className="text-sm font-medium">{count}</span>
            </div>
          );
        })}
        {statusCounts['None'] > 0 && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="status-badge bg-muted text-muted-foreground">No Status</span>
              <span className="text-xs text-muted-foreground">
                {((statusCounts['None'] / total) * 100).toFixed(0)}%
              </span>
            </div>
            <span className="text-sm font-medium">{statusCounts['None']}</span>
          </div>
        )}
      </div>
    </div>
  );
}
