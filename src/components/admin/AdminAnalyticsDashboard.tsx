import { useAdminAnalytics } from '@/hooks/useAdminAnalytics';
import { EnhancedStatsGrid } from './EnhancedStatsGrid';
import { SignupTrendChart } from './SignupTrendChart';
import { SubscriptionPieChart } from './SubscriptionPieChart';
import { RevenueAnalytics } from './RevenueAnalytics';
import { UsageAnalytics } from './UsageAnalytics';
import { ProspectDistributionSection } from './ProspectDistributionSection';
import { Loader2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export function AdminAnalyticsDashboard() {
  const { data: analytics, isLoading, error } = useAdminAnalytics();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !analytics) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Failed to load analytics data
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Enhanced Stats Grid with clickable KPIs */}
      <EnhancedStatsGrid
        totalSignups={analytics.totalSignups}
        activeProUsers={analytics.activeProUsers}
        freeUsersCount={analytics.freeUsersCount}
        neveraiTodayActive={analytics.neveraiTodayActive}
        neveraiWeekActive={analytics.neveraiWeekActive}
        totalLeads={analytics.totalLeads}
        todayLeads={analytics.todayLeads}
        revenue={analytics.revenue}
        activeUsage={analytics.activeUsage}
        conversion={analytics.conversion}
      />

      {/* Analytics Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="w-full grid grid-cols-3">
          <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
          <TabsTrigger value="revenue" className="text-xs">Revenue</TabsTrigger>
          <TabsTrigger value="usage" className="text-xs">Usage</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-3 space-y-4">
          <SignupTrendChart data={analytics.dailySignups} />
          <SubscriptionPieChart data={analytics.subscriptionBreakdown} />
        </TabsContent>

        <TabsContent value="revenue" className="mt-3">
          <RevenueAnalytics 
            revenue={analytics.revenue} 
            recentPayments={analytics.recentPayments}
          />
        </TabsContent>

        <TabsContent value="usage" className="mt-3 space-y-6">
          <UsageAnalytics activeUsage={analytics.activeUsage} />
          <ProspectDistributionSection />
        </TabsContent>
      </Tabs>
    </div>
  );
}
