import { Filter, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { KPIData } from '@/hooks/useSnapshotV2ComputedData';

interface FilterTrackingBoxProps {
  kpi: KPIData;
  stageTagNames: string[];
  className?: string;
}

/**
 * Compact "Filter" / Stage funnel box — stage-tag breakdown.
 * Stages count cumulatively (reaching Stage N fills 1..N).
 * The stage marked as the starred/final tag is highlighted inline.
 */
export function FilterTrackingBox({ kpi, stageTagNames, className }: FilterTrackingBoxProps) {
  const maxStage = Math.max(1, ...stageTagNames.map(n => kpi.stageTagTotals[n] ?? 0));

  return (
    <div className={cn(
      'rounded-xl border border-border/40 bg-card/60 p-3',
      className,
    )}>
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Filter className="h-3.5 w-3.5 text-violet-500" />
          <h4 className="text-xs font-semibold">Filter / Stages</h4>
        </div>
        <span className="text-[10px] text-muted-foreground">{stageTagNames.length} stages</span>
      </div>

      {stageTagNames.length === 0 ? (
        <p className="text-[11px] text-muted-foreground italic text-center py-2">No stages configured</p>
      ) : (
        <div className="space-y-1">
          {stageTagNames.map((name, idx) => {
            const value = kpi.stageTagTotals[name] ?? 0;
            const pct = maxStage > 0 ? (value / maxStage) * 100 : 0;
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
                        : 'bg-violet-500/15 text-violet-600 dark:text-violet-400',
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
                      isStarred ? 'bg-amber-500' : 'bg-violet-500',
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
