import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { formatTrackingValue } from '@/lib/snapshotSlotUtils';
import type { DailyMetric } from '@/hooks/useSnapshotV2ComputedData';
import type { PersonalTagData } from '@/hooks/usePersonalTagMetrics';
import { Star } from 'lucide-react';

interface MetricCardViewProps {
  dailyMetrics: DailyMetric[];
  responseTagNames: string[];
  stageTagNames: string[];
  finalTagName: string | null;
  personalTagData?: PersonalTagData;
}

/**
 * Card view: each metric becomes a card showing total + a mini sparkline bar chart
 * of values across the days in the period. Empty values render as a muted dashed
 * placeholder (per spec — keep "--" semantics, not 0).
 */
export function MetricCardView({
  dailyMetrics,
  responseTagNames,
  stageTagNames,
  finalTagName,
  personalTagData,
}: MetricCardViewProps) {
  const cards = useMemo(() => {
    const base: Array<{ label: string; isStar: boolean; values: number[] }> = [
      { label: 'Leads', isStar: false, values: dailyMetrics.map((m) => m.totalLeads) },
      { label: 'Responses', isStar: false, values: dailyMetrics.map((m) => m.totalResponses) },
      ...responseTagNames.map((name) => ({
        label: name,
        isStar: false,
        values: dailyMetrics.map((m) => m.responseTags[name] ?? 0),
      })),
      ...stageTagNames.map((name) => ({
        label: name,
        isStar: name === finalTagName,
        values: dailyMetrics.map((m) => m.stageTags[name] ?? 0),
      })),
    ];

    if (personalTagData && personalTagData.tagNames.length > 0) {
      personalTagData.tagNames.forEach((tag) => {
        base.push({
          label: tag,
          isStar: false,
          values: personalTagData.dailyMetrics.map((dm) => dm.tagCounts[tag] ?? 0),
        });
      });
    }
    return base;
  }, [dailyMetrics, responseTagNames, stageTagNames, finalTagName, personalTagData]);

  if (dailyMetrics.length === 0) {
    return <div className="text-center py-8 text-sm text-muted-foreground">No data for this month</div>;
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
      {cards.map((card) => {
        const total = card.values.reduce((sum, v) => sum + v, 0);
        const max = Math.max(1, ...card.values);
        const isEmpty = total === 0;
        return (
          <div
            key={card.label}
            className={cn(
              'rounded-xl border bg-card p-3 flex flex-col gap-2 transition-colors',
              card.isStar ? 'border-primary/40' : 'border-border/50',
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide truncate">
                {card.label}
              </span>
              {card.isStar && <Star className="h-3 w-3 text-primary shrink-0 fill-primary" />}
            </div>
            <div className="flex items-baseline gap-1.5">
              {isEmpty ? (
                <span className="text-lg font-semibold text-muted-foreground">--</span>
              ) : (
                <span className={cn('text-lg font-semibold', card.isStar ? 'text-primary' : 'text-foreground')}>
                  {formatTrackingValue(total)}
                </span>
              )}
              <span className="text-[10px] text-muted-foreground">total</span>
            </div>
            {/* Sparkline */}
            <div className="flex items-end gap-[2px] h-8">
              {isEmpty ? (
                // Dashed placeholder for empty data
                <div className="flex-1 h-full border-t-2 border-dashed border-border/60 self-center" />
              ) : (
                card.values.map((v, i) => {
                  const heightPct = (v / max) * 100;
                  const isToday = dailyMetrics[i]?.isToday;
                  return (
                    <div
                      key={i}
                      className={cn(
                        'flex-1 min-w-[2px] rounded-sm transition-all',
                        v === 0
                          ? 'bg-muted/40'
                          : isToday
                            ? 'bg-primary'
                            : card.isStar
                              ? 'bg-primary/60'
                              : 'bg-foreground/30',
                      )}
                      style={{ height: `${Math.max(v === 0 ? 4 : 8, heightPct)}%` }}
                      title={`${dailyMetrics[i]?.dateLabel}: ${formatTrackingValue(v)}`}
                    />
                  );
                })
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
