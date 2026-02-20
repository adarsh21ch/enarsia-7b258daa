import { useState, useRef, useEffect, useMemo } from 'react';
import { format, parseISO, getDaysInMonth } from 'date-fns';
import { Info, Tag } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useTrackingFormatContext } from '@/contexts/TrackingFormatContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { formatTrackingValue } from '@/lib/snapshotSlotUtils';
import { getISTDateFromISO, getISTMonthBoundsUTC, getTodayIST } from '@/lib/dateUtils';
import { ViewSelector } from '@/components/trackup-v2/ViewSelector';
import type { ViewMode } from '@/hooks/useTrackingModes';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface PersonalTagsDistributionProps {
  monthYear: string;
  monthLabel: string;
}

type PersonalViewMode = 'date-wise' | 'monthly-totals' | 'summary';

const VIEW_OPTIONS: { value: ViewMode; label: string }[] = [
  { value: 'date-wise', label: 'Date-wise' },
  { value: 'monthly-totals', label: 'Monthly Totals' },
  { value: 'summary', label: 'Summary' },
];

interface DailyTagMetric {
  date: string;
  dateLabel: string;
  dayOfWeek: string;
  isToday: boolean;
  tagCounts: Record<string, number>;
}

export function PersonalTagsDistribution({
  monthYear,
  monthLabel,
}: PersonalTagsDistributionProps) {
  const { user } = useAuth();
  const { leadsNonTrackingTags, stageNonTrackingTags } = useTrackingFormatContext();
  const [viewMode, setViewMode] = useState<PersonalViewMode>('date-wise');
  const scrollRef = useRef<HTMLDivElement>(null);

  const allPersonalTags = useMemo(() => {
    const combined = new Set([...leadsNonTrackingTags, ...stageNonTrackingTags]);
    return Array.from(combined);
  }, [leadsNonTrackingTags, stageNonTrackingTags]);

  const { data: prospects } = useQuery({
    queryKey: ['personal-tag-dist-v2', user?.id, monthYear, allPersonalTags],
    queryFn: async () => {
      if (!user || allPersonalTags.length === 0) return [];
      const bounds = getISTMonthBoundsUTC(monthYear);
      const { data, error } = await supabase
        .from('prospects')
        .select('date_added, action_taken, funnel_stage, personal_tags')
        .eq('user_id', user.id)
        .is('deleted_at', null)
        .gte('date_added', bounds.start)
        .lte('date_added', bounds.end);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user && allPersonalTags.length > 0,
    staleTime: 30_000,
  });

  const { dailyMetrics, monthlyTotals } = useMemo(() => {
    const [year, month] = monthYear.split('-').map(Number);
    const daysInMonth = getDaysInMonth(new Date(year, month - 1));
    const todayStr = getTodayIST();

    const dayMap: Record<string, Record<string, number>> = {};
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${monthYear}-${String(d).padStart(2, '0')}`;
      dayMap[dateStr] = {};
      allPersonalTags.forEach((t) => (dayMap[dateStr][t] = 0));
    }

    (prospects || []).forEach((p) => {
      const dateStr = getISTDateFromISO(p.date_added);
      if (!dayMap[dateStr]) return;
      if (p.action_taken && allPersonalTags.includes(p.action_taken)) {
        dayMap[dateStr][p.action_taken]++;
      }
      if (p.funnel_stage && allPersonalTags.includes(p.funnel_stage)) {
        dayMap[dateStr][p.funnel_stage]++;
      }
      const pTags = p.personal_tags as string[] | null;
      if (Array.isArray(pTags)) {
        pTags.forEach((t) => {
          if (dayMap[dateStr][t] !== undefined) dayMap[dateStr][t]++;
        });
      }
    });

    const dailyMetrics: DailyTagMetric[] = [];
    const totalCounts: Record<string, number> = {};
    allPersonalTags.forEach((t) => (totalCounts[t] = 0));

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${monthYear}-${String(d).padStart(2, '0')}`;
      const dateObj = parseISO(dateStr);
      const tagCounts = dayMap[dateStr];
      allPersonalTags.forEach((t) => {
        totalCounts[t] += tagCounts[t] || 0;
      });
      dailyMetrics.push({
        date: dateStr,
        dateLabel: format(dateObj, 'MMM d'),
        dayOfWeek: format(dateObj, 'EEE'),
        isToday: dateStr === todayStr,
        tagCounts,
      });
    }

    return { dailyMetrics, monthlyTotals: totalCounts };
  }, [prospects, monthYear, allPersonalTags]);

  useEffect(() => {
    if (!scrollRef.current || viewMode !== 'date-wise') return;
    const todayIdx = dailyMetrics.findIndex((m) => m.isToday);
    if (todayIdx >= 0) {
      scrollRef.current.scrollLeft = Math.max(0, todayIdx * 56 - 100);
    }
  }, [dailyMetrics, viewMode]);

  if (allPersonalTags.length === 0) return null;

  const renderDateTable = () => (
    <div
      id="personal-tags-date-table"
      className="rounded-xl border border-[hsl(var(--personal-tag-border))] overflow-hidden"
    >
      <div ref={scrollRef} className="overflow-x-auto">
        <table className="w-max min-w-full text-xs">
          <thead>
            <tr className="bg-[hsl(var(--personal-tag-header))] text-[hsl(var(--personal-tag-header-text))]">
              <th className="sticky left-0 z-10 bg-[hsl(var(--personal-tag-header))] text-[hsl(var(--personal-tag-header-text))] px-3 py-2 text-left font-semibold min-w-[100px]">
                Tag
              </th>
              {dailyMetrics.map((m) => (
                <th
                  key={m.date}
                  className={cn(
                    'px-2 py-2 text-center font-medium min-w-[56px]',
                    m.isToday && 'bg-muted/60'
                  )}
                >
                  <div className="text-[10px] opacity-70">{m.dayOfWeek}</div>
                  <div className="font-semibold">{m.dateLabel.split(' ')[1]}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {allPersonalTags.map((tag) => (
              <tr key={tag} className="border-t border-[hsl(var(--personal-tag-border))]">
                <td className="sticky left-0 z-10 bg-[hsl(var(--personal-tag-header))] text-[hsl(var(--personal-tag-header-text))] px-3 py-2 font-medium whitespace-nowrap">
                  {tag}
                </td>
                {dailyMetrics.map((m, i) => {
                  const val = m.tagCounts[tag] ?? 0;
                  return (
                    <td
                      key={i}
                      className={cn(
                        'px-2 py-2 text-center bg-card',
                        m.isToday && 'bg-muted/40',
                        val > 0 ? 'text-foreground font-medium' : 'text-muted-foreground'
                      )}
                    >
                      {formatTrackingValue(val)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div id="personal-tags-section" className="mt-4">
      <div className="border-t border-border/40 mb-4" />

      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <Tag className="h-4 w-4 text-muted-foreground" />
          <h3 id="personal-tags-title" className="text-sm font-semibold text-foreground">
            Personal Tags – Current Distribution
          </h3>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-3.5 w-3.5 text-muted-foreground/60 cursor-help" />
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[220px] text-xs">
                Shows current leads under each personal tag.
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <ViewSelector
          viewMode={viewMode as ViewMode}
          options={VIEW_OPTIONS}
          onViewModeChange={(m) => setViewMode(m as PersonalViewMode)}
        />
      </div>
      <p id="personal-tags-subtitle" className="text-[11px] text-muted-foreground mb-3">
        Shows how many leads currently have each personal tag.
      </p>

      {(viewMode === 'date-wise' || viewMode === 'summary') && renderDateTable()}

      {viewMode === 'monthly-totals' && (
        <div
          id="personal-tags-monthly-table"
          className="rounded-xl border border-[hsl(var(--personal-tag-border))] overflow-hidden"
        >
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr>
                  <th className="sticky left-0 z-10 bg-[hsl(var(--personal-tag-header))] text-[hsl(var(--personal-tag-header-text))] px-3 py-2 text-left font-semibold min-w-[100px]">
                    Month
                  </th>
                  {allPersonalTags.map((tag) => (
                    <th
                      key={tag}
                      className="bg-[hsl(var(--personal-tag-header))] text-[hsl(var(--personal-tag-header-text))] px-3 py-2 text-center font-semibold"
                    >
                      {tag}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-[hsl(var(--personal-tag-border))]">
                  <td className="sticky left-0 z-10 bg-[hsl(var(--personal-tag-header))] text-[hsl(var(--personal-tag-header-text))] px-3 py-2 font-medium">
                    {monthLabel}
                  </td>
                  {allPersonalTags.map((tag) => {
                    const val = monthlyTotals[tag] ?? 0;
                    return (
                      <td
                        key={tag}
                        className={cn(
                          'px-3 py-2 text-center bg-card',
                          val > 0 ? 'text-foreground font-medium' : 'text-muted-foreground'
                        )}
                      >
                        {formatTrackingValue(val)}
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
