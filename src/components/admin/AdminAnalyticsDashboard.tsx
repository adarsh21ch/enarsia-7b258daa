import { useAdminAnalytics } from '@/hooks/useAdminAnalytics';
import { EnhancedStatsGrid } from './EnhancedStatsGrid';
import { SignupTrendChart } from './SignupTrendChart';
import { SubscriptionPieChart } from './SubscriptionPieChart';
import { RevenueAnalytics } from './RevenueAnalytics';
import { UsageAnalytics } from './UsageAnalytics';
import { ProspectDistributionSection } from './ProspectDistributionSection';
import { TrialAnalytics } from './TrialAnalytics';
import { RetentionAnalytics } from './RetentionAnalytics';
import { CohortAnalytics } from './CohortAnalytics';
import { OfferPerformance } from './OfferPerformance';
import { ChurnRiskAlert } from './ChurnRiskAlert';
import { SubscriberHealthCard } from './SubscriberHealthCard';
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
    <div className="space-y-3">
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
        newSignupsThisMonth={analytics.newSignupsThisMonth}
      />

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="w-full grid grid-cols-6 h-8">
          <TabsTrigger value="overview" className="text-[10px] px-1 h-7">Overview</TabsTrigger>
          <TabsTrigger value="subscribers" className="text-[10px] px-1 h-7">Subscribers</TabsTrigger>
          <TabsTrigger value="trials" className="text-[10px] px-1 h-7">Trials</TabsTrigger>
          <TabsTrigger value="retention" className="text-[10px] px-1 h-7">Retention</TabsTrigger>
          <TabsTrigger value="revenue" className="text-[10px] px-1 h-7">Revenue</TabsTrigger>
          <TabsTrigger value="growth" className="text-[10px] px-1 h-7">Growth</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-2 space-y-3">
          <ChurnRiskAlert />
          <SignupTrendChart data={analytics.dailySignups} />
          <SubscriptionPieChart />
        </TabsContent>

        <TabsContent value="subscribers" className="mt-2 space-y-3">
          <SubscriberHealthCard />
        </TabsContent>

        <TabsContent value="trials" className="mt-2">
          <TrialAnalytics />
        </TabsContent>

        <TabsContent value="retention" className="mt-2 space-y-4">
          <RetentionAnalytics />
          <CohortAnalytics />
        </TabsContent>

        <TabsContent value="revenue" className="mt-2">
          <RevenueAnalytics 
            revenue={analytics.revenue} 
            recentPayments={analytics.recentPayments}
          />
        </TabsContent>

        <TabsContent value="growth" className="mt-2 space-y-3">
          <UsageAnalytics activeUsage={analytics.activeUsage} />
          <ProspectDistributionSection />
          <OfferPerformance />
        </TabsContent>
      </Tabs>
    </div>
  );
}
