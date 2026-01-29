import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useCohortAnalytics } from '@/hooks/useAdminAnalytics';
import { Loader2, Users, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from 'recharts';
import { Badge } from '@/components/ui/badge';

export function CohortAnalytics() {
  const { data, isLoading, error } = useCohortAnalytics();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !data || data.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        Failed to load cohort analytics
      </div>
    );
  }

  // Color gradient from green (recent) to gray (older)
  const getColor = (index: number, total: number) => {
    const colors = [
      'hsl(142, 71%, 45%)', // Green - Today
      'hsl(142, 60%, 50%)',
      'hsl(45, 93%, 47%)',  // Yellow
      'hsl(45, 80%, 50%)',
      'hsl(24, 95%, 53%)',  // Orange
      'hsl(24, 80%, 55%)',
      'hsl(0, 0%, 60%)',    // Gray - Old
      'hsl(0, 0%, 50%)',
    ];
    return colors[Math.min(index, colors.length - 1)];
  };

  const totalUsers = data.reduce((sum, c) => sum + c.userCount, 0);
  const totalActive = data.reduce((sum, c) => sum + c.stillActive, 0);
  const overallRetention = totalUsers > 0 ? ((totalActive / totalUsers) * 100).toFixed(1) : 0;

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 text-muted-foreground text-xs">
              <Users className="h-3 w-3" />
              <span>Total Signups</span>
            </div>
            <p className="text-xl font-bold mt-1">{totalUsers.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-0.5">All cohorts</p>
          </CardContent>
        </Card>

        <Card className="border-green-500/30 bg-green-500/5">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 text-muted-foreground text-xs">
              <TrendingUp className="h-3 w-3" />
              <span>Overall Retention</span>
            </div>
            <p className="text-xl font-bold mt-1 text-green-600">{overallRetention}%</p>
            <p className="text-xs text-muted-foreground mt-0.5">Still active</p>
          </CardContent>
        </Card>
      </div>

      {/* Cohort Bar Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Signup Cohorts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data}>
                <XAxis 
                  dataKey="cohortLabel" 
                  tick={{ fontSize: 9 }} 
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip 
                  formatter={(value: number, name: string) => [
                    value.toLocaleString(), 
                    name === 'userCount' ? 'Total Users' : 'Still Active'
                  ]}
                  contentStyle={{ fontSize: 12 }}
                />
                <Bar dataKey="userCount" name="userCount" radius={[4, 4, 0, 0]}>
                  {data.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={getColor(index, data.length)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Cohort Details Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Cohort Retention Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {data.map((cohort, index) => (
              <div 
                key={index} 
                className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
              >
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: getColor(index, data.length) }}
                  />
                  <span className="text-sm font-medium">{cohort.cohortLabel}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-sm font-medium">{cohort.userCount.toLocaleString()}</p>
                    <p className="text-[10px] text-muted-foreground">signups</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{cohort.stillActive.toLocaleString()}</p>
                    <p className="text-[10px] text-muted-foreground">active</p>
                  </div>
                  <Badge 
                    variant={cohort.retentionRate >= 50 ? 'default' : cohort.retentionRate >= 25 ? 'secondary' : 'outline'}
                    className="min-w-12 justify-center text-[10px]"
                  >
                    {cohort.retentionRate}%
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
