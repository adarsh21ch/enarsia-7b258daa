import { useAdminAnalytics } from '@/hooks/useAdminAnalytics';
import { StatsGrid } from './StatsGrid';
import { SignupTrendChart } from './SignupTrendChart';
import { SubscriptionPieChart } from './SubscriptionPieChart';
import { PaymentHistoryTable } from './PaymentHistoryTable';
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
      <StatsGrid
        todaySignups={analytics.todaySignups}
        weekSignups={analytics.weekSignups}
        monthSignups={analytics.monthSignups}
        totalRevenue={analytics.totalRevenue}
      />

      <Tabs defaultValue="signups" className="w-full">
        <TabsList className="w-full grid grid-cols-3">
          <TabsTrigger value="signups" className="text-xs">Signups</TabsTrigger>
          <TabsTrigger value="subscriptions" className="text-xs">Plans</TabsTrigger>
          <TabsTrigger value="payments" className="text-xs">Payments</TabsTrigger>
        </TabsList>

        <TabsContent value="signups" className="mt-3">
          <SignupTrendChart data={analytics.dailySignups} />
        </TabsContent>

        <TabsContent value="subscriptions" className="mt-3">
          <SubscriptionPieChart data={analytics.subscriptionBreakdown} />
        </TabsContent>

        <TabsContent value="payments" className="mt-3">
          <PaymentHistoryTable payments={analytics.recentPayments} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
