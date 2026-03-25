import { Prospect } from '@/types/prospect';
import { useMemo } from 'react';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { StageBadge, ActionBadge } from '@/components/prospects/StatusBadge';
import { useTrackingFormatContext } from '@/contexts/TrackingFormatContext';
import { Star } from 'lucide-react';

interface RecentActivityProps {
  prospects: Prospect[];
}

export function RecentActivity({ prospects }: RecentActivityProps) {
  const { isFinalTarget } = useTrackingFormatContext();
  
  const recentProspects = useMemo(() => {
    return [...prospects]
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
      .slice(0, 10);
  }, [prospects]);

  if (recentProspects.length === 0) {
    return (
      <div className="bg-card rounded-lg border border-border p-4 card-shadow">
        <h3 className="text-sm font-medium mb-4">Activity History</h3>
        <p className="text-sm text-muted-foreground text-center py-4">
          No activity history
        </p>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg border border-border p-4 card-shadow">
      <h3 className="text-sm font-medium mb-4">Activity History</h3>
      <div className="space-y-3">
        {recentProspects.map((prospect) => (
          <div
            key={prospect.id}
            className="flex items-center justify-between py-2 border-b border-border last:border-0"
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate">{prospect.name}</p>
              <div className="flex items-center gap-2 mt-1">
                {prospect.action_taken && (
                  <div className="flex items-center gap-1">
                    <ActionBadge action={prospect.action_taken} />
                    {isFinalTarget(prospect.action_taken) && (
                      <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                    )}
                  </div>
                )}
                {prospect.funnel_stage && (
                  <StageBadge stage={prospect.funnel_stage} />
                )}
              </div>
            </div>
            <p className="text-xs text-muted-foreground shrink-0 ml-2">
              {formatDistanceToNow(parseISO(prospect.updated_at), { addSuffix: true })}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
