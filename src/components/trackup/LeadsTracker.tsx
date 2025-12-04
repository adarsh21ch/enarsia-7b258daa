import { useDailyLeads, DailyLeadRow } from '@/hooks/useDailyLeads';
import { EditableCell } from './EditableCell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronLeft, ChevronRight, Users, Phone, Video, UserPlus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, parse } from 'date-fns';

const METRICS = ['leads', 'calls', 'videos', 'enrolls'] as const;

const GOALS = {
  leads: 100,
  calls: 50,
  videos: 30,
  enrolls: 10,
};

const METRIC_ICONS = {
  leads: Users,
  calls: Phone,
  videos: Video,
  enrolls: UserPlus,
};

const METRIC_COLORS = {
  leads: 'from-blue-500/20 to-blue-500/5',
  calls: 'from-green-500/20 to-green-500/5',
  videos: 'from-purple-500/20 to-purple-500/5',
  enrolls: 'from-orange-500/20 to-orange-500/5',
};

function getProgressColor(current: number, goal: number) {
  const percentage = (current / goal) * 100;
  if (percentage >= 80) return 'bg-green-500';
  if (percentage >= 50) return 'bg-yellow-500';
  return 'bg-red-500';
}

export function LeadsTracker() {
  const { rows, loading, updateCell, totals, monthYear, changeMonth, daysInMonth, daysRemaining } = useDailyLeads();

  const handleCellChange = (dayNumber: number, field: keyof DailyLeadRow, value: number) => {
    updateCell(dayNumber, field, value);
  };

  const formattedMonth = format(parse(monthYear, 'yyyy-MM', new Date()), 'MMMM yyyy');

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {METRICS.map(metric => {
          const Icon = METRIC_ICONS[metric];
          const value = totals[metric];
          const goal = GOALS[metric];
          const percentage = Math.min((value / goal) * 100, 100);
          
          return (
            <Card key={metric} className={cn("border-0 shadow-sm bg-gradient-to-br", METRIC_COLORS[metric])}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <Icon className="h-5 w-5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground capitalize">{metric}</span>
                </div>
                <p className="text-2xl font-bold">{value}</p>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-secondary/50">
                  <div
                    className={cn("h-full transition-all", getProgressColor(value, goal))}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">Goal: {goal}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Daily Leads Table */}
      <Card className="border-0 shadow-sm bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-semibold">Daily Leads Metrics</CardTitle>
          <p className="text-xs text-muted-foreground">Click any cell to edit. Press Enter to save or Escape to cancel.</p>
        </CardHeader>
        <CardContent>
          {/* Month Selector */}
          <div className="flex items-center justify-center gap-4 mb-4">
            <Button variant="ghost" size="icon" onClick={() => changeMonth('prev')}>
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <div className="text-center">
              <p className="font-semibold">{formattedMonth} ({daysInMonth - daysRemaining}/{daysInMonth})</p>
              {daysRemaining > 0 && (
                <p className="text-xs text-primary">{daysRemaining} days remaining</p>
              )}
            </div>
            <Button variant="ghost" size="icon" onClick={() => changeMonth('next')}>
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>

          {/* Table */}
          <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
            <table className="w-full">
              <thead className="sticky top-0 bg-card z-10">
                <tr className="border-b border-border">
                  <th className="py-3 px-2 text-left text-xs font-medium text-muted-foreground w-24">Date</th>
                  <th className="py-3 px-2 text-center text-xs font-medium text-muted-foreground bg-blue-50/50 dark:bg-blue-950/20">Leads</th>
                  <th className="py-3 px-2 text-center text-xs font-medium text-muted-foreground bg-green-50/50 dark:bg-green-950/20">Calls</th>
                  <th className="py-3 px-2 text-center text-xs font-medium text-muted-foreground bg-purple-50/50 dark:bg-purple-950/20">Videos</th>
                  <th className="py-3 px-2 text-center text-xs font-medium text-muted-foreground bg-orange-50/50 dark:bg-orange-950/20">Enrolls</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(row => (
                  <tr key={row.day_number} className="border-b border-border/50">
                    <td className="py-2 px-2 text-sm font-medium">Day {row.day_number}</td>
                    <td className="py-2 px-2 bg-blue-50/30 dark:bg-blue-950/10">
                      <EditableCell
                        value={row.leads}
                        onChange={(value) => handleCellChange(row.day_number, 'leads', value)}
                      />
                    </td>
                    <td className="py-2 px-2 bg-green-50/30 dark:bg-green-950/10">
                      <EditableCell
                        value={row.calls}
                        onChange={(value) => handleCellChange(row.day_number, 'calls', value)}
                      />
                    </td>
                    <td className="py-2 px-2 bg-purple-50/30 dark:bg-purple-950/10">
                      <EditableCell
                        value={row.videos}
                        onChange={(value) => handleCellChange(row.day_number, 'videos', value)}
                      />
                    </td>
                    <td className="py-2 px-2 bg-orange-50/30 dark:bg-orange-950/10">
                      <EditableCell
                        value={row.enrolls}
                        onChange={(value) => handleCellChange(row.day_number, 'enrolls', value)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="sticky bottom-0 bg-card">
                <tr className="border-t-2 border-border">
                  <td className="py-3 px-2 text-sm font-bold">TOTAL</td>
                  {METRICS.map(metric => (
                    <td key={metric} className="py-3 px-2">
                      <div className="h-8 flex items-center justify-center text-sm font-bold rounded bg-gradient-to-r from-primary/10 to-primary/5">
                        {totals[metric]}
                      </div>
                    </td>
                  ))}
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
