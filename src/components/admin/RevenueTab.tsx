import { useAdminAnalytics } from '@/hooks/useAdminAnalytics';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PlansManager } from './PlansManager';
import { OffersManager } from './OffersManager';
import { IndianRupee, ArrowDown, ArrowUp, Minus, CreditCard, TrendingUp, Calendar } from 'lucide-react';

export function RevenueTab() {
  const { data: analytics } = useAdminAnalytics();
  const revenue = analytics?.revenue;

  const formatRevenue = (amt: number) => `₹${(amt / 100).toLocaleString('en-IN')}`;

  const revenueChange = revenue && revenue.lastMonthRevenue > 0
    ? Math.round(((revenue.thisMonthRevenue - revenue.lastMonthRevenue) / revenue.lastMonthRevenue) * 100)
    : 0;

  return (
    <div className="space-y-4">
      {/* Revenue Summary Card */}
      {revenue && (
        <div className="rounded-2xl border border-border/50 bg-card p-4 space-y-3">
          <div className="flex items-center gap-2">
            <IndianRupee className="h-4 w-4 text-emerald-600" />
            <h3 className="text-sm font-bold font-heading">Revenue Summary</h3>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <SummaryItem label="All time" value={formatRevenue(revenue.totalRevenue)} />
            <SummaryItem
              label="This month"
              value={formatRevenue(revenue.thisMonthRevenue)}
              badge={revenueChange !== 0 ? (
                <span className={`inline-flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                  revenueChange > 0
                    ? 'text-emerald-700 bg-emerald-500/10'
                    : 'text-red-700 bg-red-500/10'
                }`}>
                  {revenueChange > 0 ? <ArrowUp className="h-2.5 w-2.5" /> : <ArrowDown className="h-2.5 w-2.5" />}
                  {Math.abs(revenueChange)}%
                </span>
              ) : null}
              warning={revenueChange < -30}
            />
            <SummaryItem label="Last month" value={formatRevenue(revenue.lastMonthRevenue)} />
            <SummaryItem label="Payments" value={`${revenue.successfulPayments} total`} />
          </div>

          {revenueChange < -30 && (
            <div className="rounded-xl bg-red-500/8 border border-red-500/20 px-3 py-2 text-xs text-red-700 dark:text-red-400">
              ⚠️ Revenue dropped {Math.abs(revenueChange)}% compared to last month
            </div>
          )}
        </div>
      )}

      {/* Plans + Offers sub-tabs */}
      <Tabs defaultValue="plans" className="w-full">
        <TabsList className="w-full grid grid-cols-2 h-9">
          <TabsTrigger value="plans" className="text-xs h-7">💎 Plans</TabsTrigger>
          <TabsTrigger value="offers" className="text-xs h-7">🏷️ Offers</TabsTrigger>
        </TabsList>
        <TabsContent value="plans" className="mt-3">
          <PlansManager />
        </TabsContent>
        <TabsContent value="offers" className="mt-3">
          <OffersManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SummaryItem({ label, value, badge, warning }: {
  label: string;
  value: string;
  badge?: React.ReactNode;
  warning?: boolean;
}) {
  return (
    <div className={`rounded-xl border p-3 ${warning ? 'border-red-500/30 bg-red-500/5' : 'border-border/30 bg-muted/30'}`}>
      <p className="text-[10px] text-muted-foreground mb-0.5">{label}</p>
      <div className="flex items-center gap-2">
        <p className="text-base font-bold font-heading">{value}</p>
        {badge}
      </div>
    </div>
  );
}
