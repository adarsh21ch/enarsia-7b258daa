import { useProspectFunnelStats, FunnelStats } from '@/hooks/useProspectFunnelStats';
import { Skeleton } from '@/components/ui/skeleton';
import { Activity } from 'lucide-react';
import { cn } from '@/lib/utils';

const STAGES: (keyof FunnelStats)[] = ['enrollment', 'day_1', 'day_2', 'day_3', 'minimum_bill', 'level_up', 'two_cc'];

const STAGE_LABELS: Record<keyof FunnelStats, string> = {
  enrollment: 'Enrollment',
  day_1: 'Day 1',
  day_2: 'Day 2',
  day_3: 'Day 3',
  minimum_bill: 'Min Billing',
  level_up: 'Level Up',
  two_cc: '2CC',
};

export function AutoFunnelTracker() {
  const { totals, loading, totalProspects } = useProspectFunnelStats();

  if (loading) {
    return <Skeleton className="h-48 w-full rounded-2xl" />;
  }

  return (
    <div className="glass-card rounded-2xl overflow-hidden">
      <div className="p-4 border-b border-border/50 bg-gradient-to-r from-primary/5 to-transparent">
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Live Funnel Tracker (Auto)</h3>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Real-time counts from your prospects. Total: {totalProspects} prospects.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-muted/50">
              <th className="px-4 py-3 text-left text-xs font-bold text-foreground uppercase tracking-wide">Stage</th>
              <th className="px-4 py-3 text-center text-xs font-bold text-foreground uppercase tracking-wide">Count</th>
            </tr>
          </thead>
          <tbody>
            {STAGES.map((stage, idx) => (
              <tr 
                key={stage}
                className={cn(
                  "border-b border-border/20 transition-colors",
                  idx % 2 === 0 ? "bg-transparent" : "bg-muted/10"
                )}
              >
                <td className="px-4 py-3">
                  <span className="text-sm font-medium">{STAGE_LABELS[stage]}</span>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={cn(
                    "inline-flex items-center justify-center min-w-[40px] px-3 py-1 rounded-full text-sm font-semibold",
                    totals[stage] > 0 ? "bg-primary/10 text-primary" : "bg-muted/50 text-muted-foreground"
                  )}>
                    {totals[stage]}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Total Row */}
      <div className="bg-primary/10 border-t border-primary/20">
        <div className="flex justify-between items-center px-4 py-3">
          <span className="text-sm font-bold text-foreground">TOTAL</span>
          <span className="text-sm font-bold text-primary">{totalProspects}</span>
        </div>
      </div>
    </div>
  );
}
