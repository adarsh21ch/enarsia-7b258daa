import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTrialAnalytics } from '@/hooks/useAdminAnalytics';
import { Loader2, Timer, Clock, CheckCircle, TrendingUp, AlertTriangle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from 'recharts';

export function TrialAnalytics() {
  const { data, isLoading, error } = useTrialAnalytics();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        Failed to load trial analytics
      </div>
    );
  }

  const funnelData = [
    { name: 'Active Trials', value: data.activeTrials, color: 'hsl(var(--primary))' },
    { name: 'Expired', value: data.expiredTrials, color: 'hsl(var(--muted-foreground))' },
    { name: 'Converted', value: data.convertedToPro, color: 'hsl(142, 71%, 45%)' },
  ];

  const dailyBreakdown = [
    { day: 'Day 1', count: data.day1Users },
    { day: 'Day 2', count: data.day2Users },
    { day: 'Day 3', count: data.day3Users },
    { day: 'Day 4', count: data.day4Users },
    { day: 'Day 5', count: data.day5Users },
    { day: 'Day 6', count: data.day6Users },
    { day: 'Day 7', count: data.day7Users },
  ];

  return (
    <div className="space-y-4">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 text-muted-foreground text-xs">
              <Timer className="h-3 w-3" />
              <span>Active Trials</span>
            </div>
            <p className="text-xl font-bold mt-1">{data.activeTrials.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Currently in trial</p>
          </CardContent>
        </Card>

        <Card className={data.trialsExpiringToday > 0 ? 'border-yellow-500/30 bg-yellow-500/5' : ''}>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 text-muted-foreground text-xs">
              <AlertTriangle className="h-3 w-3 text-yellow-500" />
              <span>Expiring Today</span>
            </div>
            <p className="text-xl font-bold mt-1">{data.trialsExpiringToday}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Action needed!</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 text-muted-foreground text-xs">
              <Clock className="h-3 w-3" />
              <span>Expired (No CVT)</span>
            </div>
            <p className="text-xl font-bold mt-1">{data.expiredTrials.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Trial ended, not converted</p>
          </CardContent>
        </Card>

        <Card className="border-green-500/30 bg-green-500/5">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 text-muted-foreground text-xs">
              <CheckCircle className="h-3 w-3 text-green-500" />
              <span>Converted to Pro</span>
            </div>
            <p className="text-xl font-bold mt-1">{data.convertedToPro}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Upgraded successfully</p>
          </CardContent>
        </Card>
      </div>

      {/* Conversion Metrics */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 text-muted-foreground text-xs">
              <TrendingUp className="h-3 w-3" />
              <span>Conversion Rate</span>
            </div>
            <p className="text-xl font-bold mt-1 text-green-600">{data.conversionRate}%</p>
            <p className="text-xs text-muted-foreground mt-0.5">Trial → Pro</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 text-muted-foreground text-xs">
              <Clock className="h-3 w-3" />
              <span>Avg Days to Convert</span>
            </div>
            <p className="text-xl font-bold mt-1">{data.avgDaysToConvert}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Before upgrade</p>
          </CardContent>
        </Card>
      </div>

      {/* Trial Funnel Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Trial Funnel</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-32">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={funnelData} layout="vertical">
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 11 }} />
                <Tooltip 
                  formatter={(value: number) => [value.toLocaleString(), 'Users']}
                  contentStyle={{ fontSize: 12 }}
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {funnelData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Daily Trial Breakdown */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Trial Day Breakdown (Recent Signups)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyBreakdown}>
                <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip 
                  formatter={(value: number) => [value.toLocaleString(), 'Users']}
                  contentStyle={{ fontSize: 12 }}
                />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-xs text-muted-foreground text-center mt-2">
            Users who signed up X days ago (Day 1 = Today)
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
