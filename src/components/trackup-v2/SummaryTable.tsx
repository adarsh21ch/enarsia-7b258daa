import { useRef, useEffect, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { formatTrackingValue } from '@/lib/snapshotSlotUtils';
import { PersonalTagExpandableRows } from './PersonalTagExpandableRows';
import type { DailyMetric } from '@/hooks/useSnapshotV2ComputedData';
import type { PersonalTagData } from '@/hooks/usePersonalTagMetrics';

interface SummaryTableProps {
  dailyMetrics: DailyMetric[];
  responseTagNames: string[];
  stageTagNames: string[];
  finalTagName: string | null;
  personalTagData?: PersonalTagData;
}

export function SummaryTable({
  dailyMetrics,
  responseTagNames,
  stageTagNames,
  finalTagName,
  personalTagData,
}: SummaryTableProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const metricRows = useMemo(() => {
    const rows: { label: string; isStar: boolean; values: number[] }[] = [
      { label: 'Leads', isStar: false, values: dailyMetrics.map((m) => m.totalLeads) },
      { label: 'Responses', isStar: false, values: dailyMetrics.map((m) => m.totalResponses) },
      ...responseTagNames.map((name) => ({
        label: name, isStar: false, values: dailyMetrics.map((m) => m.responseTags[name] ?? 0),
      })),
      ...stageTagNames.map((name) => ({
        label: name, isStar: name === finalTagName, values: dailyMetrics.map((m) => m.stageTags[name] ?? 0),
      })),
    ];
    return rows;
  }, [dailyMetrics, responseTagNames, stageTagNames, finalTagName]);

  const { personalTagRows, todayIndices } = useMemo(() => {
    if (!personalTagData || personalTagData.tagNames.length === 0) {
      return { personalTagRows: [], todayIndices: [] };
    }
    const todayIdx: number[] = [];
    dailyMetrics.forEach((m, i) => { if (m.isToday) todayIdx.push(i); });

    const rows = personalTagData.tagNames.map((tag) => ({
      label: tag,
      values: personalTagData.dailyMetrics.map((dm) => dm.tagCounts[tag] ?? 0),
    }));
    return { personalTagRows: rows, todayIndices: todayIdx };
  }, [personalTagData, dailyMetrics]);

  useEffect(() => {
    if (!scrollRef.current) return;
    const todayIdx = dailyMetrics.findIndex((m) => m.isToday);
    if (todayIdx >= 0) {
      const colWidth = 48;
      const stickyCol = 90;
      const containerWidth = scrollRef.current.clientWidth;
      scrollRef.current.scrollLeft = Math.max(0, todayIdx * colWidth - (containerWidth - stickyCol) / 2);
    }
  }, [dailyMetrics]);

  if (dailyMetrics.length === 0) {
    return <div className="text-center py-8 text-sm text-muted-foreground">No data for this month</div>;
  }

  return (
    <div className="rounded-xl border border-border/50 overflow-hidden">
      <div ref={scrollRef} className="overflow-x-auto">
        <table className="text-xs" style={{ tableLayout: 'fixed', width: `${dailyMetrics.length * 48 + 90}px` }}>
          <colgroup>
            <col style={{ width: '90px' }} />
            {dailyMetrics.map((m) => (
              <col key={m.date} style={{ width: '48px' }} />
            ))}
          </colgroup>
          <thead>
            <tr className="bg-accent text-accent-foreground">
              <th className="sticky left-0 z-10 bg-accent text-accent-foreground px-2 py-2 text-left font-semibold whitespace-nowrap">Metric</th>
              {dailyMetrics.map((m) => (
                <th key={m.date} className={cn('px-2 py-2 text-center font-medium min-w-[48px]', m.isToday && 'bg-accent/80')}>
                  <div className="text-[10px] text-accent-foreground/70">{m.dayOfWeek}</div>
                  <div className="font-semibold">{m.dateLabel.split(' ')[1]}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {metricRows.map((row) => (
              <tr key={row.label} className="border-t border-border/30">
                <td className="sticky left-0 z-10 bg-accent text-accent-foreground px-2 py-2 font-medium whitespace-nowrap overflow-hidden text-ellipsis">{row.label}</td>
                {row.values.map((val, i) => (
                  <td key={i} className={cn('px-2 py-2 text-center', dailyMetrics[i]?.isToday && 'bg-accent/10', val > 0 ? 'text-foreground font-medium' : 'text-muted-foreground')}>
                    {formatTrackingValue(val)}
                  </td>
                ))}
              </tr>
            ))}
            <PersonalTagExpandableRows
              tagNames={personalTagData?.tagNames ?? []}
              tagRows={personalTagRows}
              columnCount={dailyMetrics.length}
              todayIndices={todayIndices}
            />
          </tbody>
        </table>
      </div>
    </div>
  );
}
