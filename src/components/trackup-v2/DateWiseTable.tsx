import { useRef, useEffect, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { formatTrackingValue } from '@/lib/snapshotSlotUtils';
import { PersonalTagExpandableRows } from './PersonalTagExpandableRows';
import type { DailyMetric } from '@/hooks/useSnapshotV2ComputedData';
import type { PersonalTagData } from '@/hooks/usePersonalTagMetrics';

interface DateWiseTableProps {
  dailyMetrics: DailyMetric[];
  responseTagNames: string[];
  finalTagName: string | null;
  personalTagData?: PersonalTagData;
}

export function DateWiseTable({
  dailyMetrics,
  responseTagNames,
  finalTagName,
  personalTagData
}: DateWiseTableProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const metricRows = useMemo(() => {
    const rows: {label: string;isStar: boolean;values: number[];total: number;}[] = [
    { label: 'Leads', isStar: false, values: dailyMetrics.map((m) => m.totalLeads), total: dailyMetrics.reduce((s, m) => s + m.totalLeads, 0) },
    { label: 'Responses', isStar: false, values: dailyMetrics.map((m) => m.totalResponses), total: dailyMetrics.reduce((s, m) => s + m.totalResponses, 0) },
    ...responseTagNames.map((name) => {
      const values = dailyMetrics.map((m) => m.responseTags[name] ?? 0);
      return { label: name, isStar: name === finalTagName, values, total: values.reduce((s, v) => s + v, 0) };
    })];

    return rows;
  }, [dailyMetrics, responseTagNames, finalTagName]);

  const { personalTagRows, todayIndices } = useMemo(() => {
    if (!personalTagData || personalTagData.tagNames.length === 0) {
      return { personalTagRows: [], todayIndices: [] };
    }
    const todayIdx: number[] = [];
    dailyMetrics.forEach((m, i) => {if (m.isToday) todayIdx.push(i);});
    const rows = personalTagData.tagNames.map((tag) => ({
      label: tag,
      values: personalTagData.dailyMetrics.map((dm) => dm.tagCounts[tag] ?? 0)
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
        <table className="text-xs" style={{ tableLayout: 'fixed', width: `${dailyMetrics.length * 48 + 90 + 52}px` }}>
          <colgroup>
            <col style={{ width: '90px' }} />
            {dailyMetrics.map((m) =>
            <col key={m.date} style={{ width: '48px' }} />
            )}
            <col style={{ width: '52px' }} />
          </colgroup>
          <thead>
            <tr className="bg-muted/60 border-b border-border">
              <th className="sticky left-0 z-10 bg-muted/60 text-muted-foreground px-2 py-2 text-left font-semibold whitespace-nowrap uppercase tracking-wider text-[10px]">Metric</th>
              {dailyMetrics.map((m) =>
              <th key={m.date} className={cn('px-2 py-2 text-center font-medium min-w-[48px] text-muted-foreground', m.isToday && 'bg-primary/10 text-primary')}>
                  <div className="text-[10px] opacity-70">{m.dayOfWeek}</div>
                  <div className="font-semibold">{m.dateLabel.split(' ')[1]}</div>
                </th>
              )}
              <th className="px-2 py-2 text-center font-semibold bg-muted text-foreground uppercase tracking-wider text-[10px]">Total</th>
            </tr>
          </thead>
          <tbody>
            {metricRows.map((row) =>
            <tr key={row.label} className="border-t border-border/40">
                <td className="sticky left-0 z-10 bg-card text-foreground px-2 py-2 font-medium whitespace-nowrap overflow-hidden text-ellipsis">{row.label}</td>
                {row.values.map((val, i) =>
              <td key={i} className={cn('px-2 py-2 text-center', dailyMetrics[i]?.isToday && 'bg-primary/5', val > 0 ? 'text-primary font-semibold' : 'text-muted-foreground/60')}>
                    {val > 0 ? formatTrackingValue(val) : '–'}
                  </td>
              )}
                <td className="px-2 py-2 text-center font-semibold bg-muted/70 text-foreground">
                  {formatTrackingValue(row.total)}
                </td>
              </tr>
            )}
            <PersonalTagExpandableRows
              tagNames={personalTagData?.tagNames ?? []}
              tagRows={personalTagRows}
              columnCount={dailyMetrics.length + 1}
              todayIndices={todayIndices} />

          </tbody>
        </table>
      </div>
    </div>);

}