import { useRef, useEffect, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { formatTrackingValue } from '@/lib/snapshotSlotUtils';
import type { DailyMetric } from '@/hooks/useSnapshotV2ComputedData';

interface SummaryTableProps {
  dailyMetrics: DailyMetric[];
  responseTagNames: string[];
  stageTagNames: string[];
  finalTagName: string | null;
}

export function SummaryTable({
  dailyMetrics,
  responseTagNames,
  stageTagNames,
  finalTagName,
}: SummaryTableProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Build metric rows (transposed: metrics as rows, dates as columns)
  const metricRows = useMemo(() => {
    const rows: { label: string; isStar: boolean; values: number[] }[] = [
      {
        label: 'Leads',
        isStar: false,
        values: dailyMetrics.map((m) => m.totalLeads),
      },
      {
        label: 'Responses',
        isStar: false,
        values: dailyMetrics.map((m) => m.totalResponses),
      },
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
    return rows;
  }, [dailyMetrics, responseTagNames, stageTagNames, finalTagName]);

  // Auto-scroll to today
  useEffect(() => {
    if (!scrollRef.current) return;
    const todayIdx = dailyMetrics.findIndex((m) => m.isToday);
    if (todayIdx >= 0) {
      const cellWidth = 56; // approximate
      scrollRef.current.scrollLeft = Math.max(0, todayIdx * cellWidth - 100);
    }
  }, [dailyMetrics]);

  if (dailyMetrics.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-muted-foreground">
        No data for this month
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border/50 overflow-hidden">
      <div ref={scrollRef} className="overflow-x-auto">
        <table className="w-max min-w-full text-xs">
          {/* Header: date labels */}
          <thead>
            <tr className="bg-accent text-accent-foreground">
              <th className="sticky left-0 z-10 bg-accent text-accent-foreground px-3 py-2 text-left font-semibold min-w-[100px]">
                Metric
              </th>
              {dailyMetrics.map((m) => (
                <th
                  key={m.date}
                  className={cn(
                    'px-2 py-2 text-center font-medium min-w-[56px]',
                    m.isToday && 'bg-accent/80'
                  )}
                >
                  <div className="text-[10px] text-accent-foreground/70">
                    {m.dayOfWeek}
                  </div>
                  <div className="font-semibold">{m.dateLabel.split(' ')[1]}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {metricRows.map((row) => (
              <tr key={row.label} className="border-t border-border/30">
                <td className="sticky left-0 z-10 bg-accent text-accent-foreground px-3 py-2 font-medium whitespace-nowrap">
                  {row.label}
                </td>
                {row.values.map((val, i) => (
                  <td
                    key={i}
                    className={cn(
                      'px-2 py-2 text-center',
                      dailyMetrics[i]?.isToday && 'bg-accent/10',
                      val > 0 ? 'text-foreground font-medium' : 'text-muted-foreground'
                    )}
                  >
                    {formatTrackingValue(val)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
