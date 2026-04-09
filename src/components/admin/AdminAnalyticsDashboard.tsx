import { useAdminAnalytics } from '@/hooks/useAdminAnalytics';
import { HealthScoreCard } from './HealthScoreCard';
import { GrowthMetricCards } from './GrowthMetricCards';
import { SignupTrendChart } from './SignupTrendChart';
import { SubscriberHealthSection } from './SubscriberHealthSection';
import { SubscriptionPieChart } from './SubscriptionPieChart';
import { RevenueAnalytics } from './RevenueAnalytics';
import { UsageAnalytics } from './UsageAnalytics';
import { ProspectDistributionSection } from './ProspectDistributionSection';
import { TrialAnalytics } from './TrialAnalytics';
import { RetentionAnalytics } from './RetentionAnalytics';
import { CohortAnalytics } from './CohortAnalytics';
import { OfferPerformance } from './OfferPerformance';
import { Loader2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

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
      {/* Section A: Health Score */}
      <HealthScoreCard analytics={analytics} />

      {/* Section B: Growth Metrics */}
      <GrowthMetricCards analytics={analytics} />

      {/* Section C: Signups Chart */}
      <SignupTrendChart data={analytics.dailySignups} />

      {/* Section D: Subscriber Health */}
      <SubscriberHealthSection />

      {/* Section E: Sub-analytics tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <ScrollArea className="w-full">
          <TabsList className="inline-flex w-max gap-0.5 h-9">
            <TabsTrigger value="overview" className="text-[11px] px-3 h-7">Overview</TabsTrigger>
            <TabsTrigger value="subscribers" className="text-[11px] px-3 h-7">Subscribers</TabsTrigger>
            <TabsTrigger value="trials" className="text-[11px] px-3 h-7">Trials</TabsTrigger>
            <TabsTrigger value="retention" className="text-[11px] px-3 h-7">Retention</TabsTrigger>
            <TabsTrigger value="revenue" className="text-[11px] px-3 h-7">Revenue</TabsTrigger>
            <TabsTrigger value="growth" className="text-[11px] px-3 h-7">Growth</TabsTrigger>
          </TabsList>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>

        <TabsContent value="overview" className="mt-3 space-y-3">
          <SubscriptionPieChart />
        </TabsContent>

        <TabsContent value="subscribers" className="mt-3 space-y-3">
          {/* Already shown above, this tab can show deeper detail */}
          <SubscriptionPieChart />
        </TabsContent>

        <TabsContent value="trials" className="mt-3">
          <TrialAnalytics />
        </TabsContent>

        <TabsContent value="retention" className="mt-3 space-y-4">
          <RetentionAnalytics />
          <CohortAnalytics />
        </TabsContent>

        <TabsContent value="revenue" className="mt-3">
          <RevenueAnalytics 
            revenue={analytics.revenue} 
            recentPayments={analytics.recentPayments}
          />
        </TabsContent>

        <TabsContent value="growth" className="mt-3 space-y-3">
          <UsageAnalytics activeUsage={analytics.activeUsage} />
          <ProspectDistributionSection />
          <OfferPerformance />
        </TabsContent>
      </Tabs>
    </div>
  );
}
