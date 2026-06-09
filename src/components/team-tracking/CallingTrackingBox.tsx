import { Phone, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { KPIData } from '@/hooks/useSnapshotV2ComputedData';

interface CallingTrackingBoxProps {
  kpi: KPIData;
  responseTagNames: string[];
  className?: string;
}

/**
 * Compact "Calling" KPI box — per-response-tag breakdown.
 * The tag marked as the starred/final tag is highlighted inline.
 */
export function CallingTrackingBox({ kpi, responseTagNames, className }: CallingTrackingBoxProps) {
  const maxValue = Math.max(1, ...responseTagNames.map(n => kpi.responseTagTotals[n] ?? 0));

  return (
    <div className={cn(
      'rounded-xl border border-border/40 bg-card/60 p-3',
      className,
    )}>
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Phone className="h-3.5 w-3.5 text-primary" />
          <h4 className="text-xs font-semibold">Calling / Responses</h4>
        </div>
        <span className="text-[10px] text-muted-foreground">{kpi.daysWithData}d data</span>
      </div>

      {responseTagNames.length === 0 ? (
        <p className="text-[11px] text-muted-foreground italic text-center py-2">No response tags configured</p>
      ) : (
        <div className="space-y-1">
          {responseTagNames.map((name, idx) => {
            const value = kpi.responseTagTotals[name] ?? 0;
            const pct = maxValue > 0 ? (value / maxValue) * 100 : 0;
            const isStarred = !!kpi.finalTagName && name === kpi.finalTagName;
            return (
              <div key={name} className="space-y-0.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className={cn(
                    'flex items-center gap-1 min-w-0',
                    isStarred ? 'text-amber-700 dark:text-amber-400 font-semibold' : 'text-muted-foreground',
                  )}>
                    <span className={cn(
                      'inline-flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold',
                      isStarred
                        ? 'bg-amber-500/20 text-amber-700 dark:text-amber-400'
                        : 'bg-primary/15 text-primary',
                    )}>
                      {isStarred ? <Star className="h-2.5 w-2.5 fill-current" /> : idx + 1}
                    </span>
                    <span className="truncate">{name}</span>
                  </span>
                  <span className={cn(
                    'font-semibold tabular-nums',
                    isStarred && 'text-amber-700 dark:text-amber-400',
                  )}>{value}</span>
                </div>
                <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all',
                      isStarred ? 'bg-amber-500' : 'bg-primary',
                    )}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
