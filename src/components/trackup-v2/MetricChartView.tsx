import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from 'recharts';
import { cn } from '@/lib/utils';
import { formatTrackingValue } from '@/lib/snapshotSlotUtils';
import type { DailyMetric } from '@/hooks/useSnapshotV2ComputedData';
import type { PersonalTagData } from '@/hooks/usePersonalTagMetrics';

interface MetricChartViewProps {
  dailyMetrics: DailyMetric[];
  responseTagNames: string[];
  stageTagNames: string[];
  finalTagName: string | null;
  personalTagData?: PersonalTagData;
}

/**
 * Chart view: a horizontal-friendly grouped bar chart with metrics on X axis
 * (label) and total value on Y axis. The final/star tag is highlighted in
 * primary color. Empty metrics show a muted dashed placeholder bar.
 */
export function MetricChartView({
  dailyMetrics,
  responseTagNames,
  stageTagNames,
  finalTagName,
  personalTagData,
}: MetricChartViewProps) {
  const chartData = useMemo(() => {
    const rows: Array<{ name: string; value: number; isStar: boolean; isEmpty: boolean }> = [
      {
        name: 'Leads',
        value: dailyMetrics.reduce((s, m) => s + m.totalLeads, 0),
        isStar: false,
        isEmpty: false,
      },
      {
        name: 'Responses',
        value: dailyMetrics.reduce((s, m) => s + m.totalResponses, 0),
        isStar: false,
        isEmpty: false,
      },
      ...responseTagNames.map((name) => ({
        name,
        value: dailyMetrics.reduce((s, m) => s + (m.responseTags[name] ?? 0), 0),
        isStar: false,
        isEmpty: false,
      })),
      ...stageTagNames.map((name) => ({
        name,
        value: dailyMetrics.reduce((s, m) => s + (m.stageTags[name] ?? 0), 0),
        isStar: name === finalTagName,
        isEmpty: false,
      })),
    ];

    if (personalTagData && personalTagData.tagNames.length > 0) {
      personalTagData.tagNames.forEach((tag) => {
        rows.push({
          name: tag,
          value: personalTagData.dailyMetrics.reduce((s, dm) => s + (dm.tagCounts[tag] ?? 0), 0),
          isStar: false,
          isEmpty: false,
        });
      });
    }

    return rows.map((r) => ({ ...r, isEmpty: r.value === 0 }));
  }, [dailyMetrics, responseTagNames, stageTagNames, finalTagName, personalTagData]);

  if (dailyMetrics.length === 0) {
    return <div className="text-center py-8 text-sm text-muted-foreground">No data for this month</div>;
  }

  const allEmpty = chartData.every((r) => r.isEmpty);

  return (
    <div className="rounded-xl border border-border/50 bg-card p-3">
      <div className="w-full" style={{ height: Math.max(220, chartData.length * 28) }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 4, right: 16, left: 4, bottom: 4 }}
          >
            <XAxis
              type="number"
              tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="name"
              width={90}
              tick={{ fontSize: 10, fill: 'hsl(var(--foreground))' }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              cursor={{ fill: 'hsl(var(--muted) / 0.4)' }}
              contentStyle={{
                background: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: 8,
                fontSize: 12,
              }}
              formatter={(val: number) => [formatTrackingValue(val), 'Total']}
            />
            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
              {chartData.map((entry, i) => (
                <Cell
                  key={i}
                  fill={
                    entry.isEmpty
                      ? 'hsl(var(--muted))'
                      : entry.isStar
                        ? 'hsl(var(--primary))'
                        : 'hsl(var(--primary) / 0.55)'
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      {allEmpty && (
        <p className={cn('text-center text-[11px] text-muted-foreground mt-2')}>
          -- No activity recorded for this period --
        </p>
      )}
    </div>
  );
}
