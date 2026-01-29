import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useRetentionAnalytics } from '@/hooks/useAdminAnalytics';
import { Loader2, Users, TrendingUp, RefreshCw } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface RetentionRow {
  label: string;
  count: number;
  color: string;
}

export function RetentionAnalytics() {
  const { data, isLoading, error } = useRetentionAnalytics();

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
        Failed to load retention analytics
      </div>
    );
  }

  const retentionBuckets: RetentionRow[] = [
    { label: 'Today', count: data.todayActive, color: 'bg-green-500' },
    { label: 'Yesterday', count: data.yesterdayActive, color: 'bg-green-400' },
    { label: '2-3 days ago', count: data.twoThreeDaysActive, color: 'bg-yellow-500' },
    { label: '4-7 days ago', count: data.fourSevenDaysActive, color: 'bg-yellow-600' },
    { label: '1-2 weeks ago', count: data.oneTwoWeeksActive, color: 'bg-orange-500' },
    { label: 'Inactive 30+', count: data.inactive30Plus, color: 'bg-red-500' },
  ];

  const maxCount = Math.max(...retentionBuckets.map(b => b.count), 1);

  return (
    <div className="space-y-4">
      {/* DAU/WAU/MAU Cards */}
      <div className="grid grid-cols-3 gap-2">
        <Card>
          <CardContent className="pt-3 pb-2 text-center">
            <p className="text-xs text-muted-foreground">DAU</p>
            <p className="text-lg font-bold">{data.dau.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-3 pb-2 text-center">
            <p className="text-xs text-muted-foreground">WAU</p>
            <p className="text-lg font-bold">{data.wau.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-3 pb-2 text-center">
            <p className="text-xs text-muted-foreground">MAU</p>
            <p className="text-lg font-bold">{data.mau.toLocaleString()}</p>
          </CardContent>
        </Card>
      </div>

      {/* Returning Rate Card */}
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="pt-4 pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-muted-foreground text-xs">
              <RefreshCw className="h-3 w-3" />
              <span>Returning Users Rate</span>
            </div>
            <p className="text-xl font-bold text-primary">{data.returningRate}%</p>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Users who came back after first visit
          </p>
        </CardContent>
      </Card>

      {/* Activity Breakdown Heatmap */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Users className="h-4 w-4" />
            Activity Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {retentionBuckets.map((bucket, index) => (
            <div key={index} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{bucket.label}</span>
                <span className="font-medium">{bucket.count.toLocaleString()}</span>
              </div>
              <div className="relative h-5 w-full bg-muted rounded-full overflow-hidden">
                <div 
                  className={`absolute inset-y-0 left-0 ${bucket.color} rounded-full transition-all duration-500`}
                  style={{ width: `${(bucket.count / maxCount) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Engagement Health */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Engagement Health
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-muted-foreground">DAU/MAU Ratio</span>
                <span className="font-medium">
                  {data.mau > 0 ? ((data.dau / data.mau) * 100).toFixed(1) : 0}%
                </span>
              </div>
              <Progress 
                value={data.mau > 0 ? (data.dau / data.mau) * 100 : 0} 
                className="h-2" 
              />
              <p className="text-[10px] text-muted-foreground mt-1">
                &gt;20% is healthy for most apps
              </p>
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-muted-foreground">WAU/MAU Ratio</span>
                <span className="font-medium">
                  {data.mau > 0 ? ((data.wau / data.mau) * 100).toFixed(1) : 0}%
                </span>
              </div>
              <Progress 
                value={data.mau > 0 ? (data.wau / data.mau) * 100 : 0} 
                className="h-2" 
              />
              <p className="text-[10px] text-muted-foreground mt-1">
                &gt;50% indicates good weekly engagement
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
