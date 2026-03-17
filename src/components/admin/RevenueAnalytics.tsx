import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useRevenueTrend, RevenueStats, PaymentLog } from '@/hooks/useAdminAnalytics';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { IndianRupee, TrendingUp, TrendingDown, CreditCard, CheckCircle, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface RevenueAnalyticsProps {
  revenue: RevenueStats;
  recentPayments: PaymentLog[];
}

// Fetch active plans from admin_subscription_plans for the pie chart
function useActivePlans() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['admin-active-plans', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_subscription_plans')
        .select('plan_key, plan_name, display_name, tier, price_inr, duration_days')
        .eq('is_active', true)
        .order('sort_order');
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });
}

// Fetch payment counts grouped by amount from payments_log
function usePlanPaymentCounts() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['admin-plan-payment-counts', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payments_log')
        .select('amount')
        .eq('status', 'success')
        .not('amount', 'is', null);
      if (error) throw error;
      
      // Aggregate by amount (paise)
      const counts: Record<number, { count: number; revenue: number }> = {};
      (data || []).forEach((p: any) => {
        const amt = Number(p.amount) || 0;
        if (amt <= 0) return;
        if (!counts[amt]) counts[amt] = { count: 0, revenue: 0 };
        counts[amt].count++;
        counts[amt].revenue += amt;
      });
      return counts;
    },
    enabled: !!user,
    staleTime: 2 * 60 * 1000,
  });
}

const PLAN_COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  'hsl(45 93% 47%)',
];

export function RevenueAnalytics({ revenue, recentPayments }: RevenueAnalyticsProps) {
  const { data: revenueTrend } = useRevenueTrend(30);
  const { data: activePlans } = useActivePlans();
  const { data: planCounts } = usePlanPaymentCounts();

  const formatAmount = (amount: number) => `₹${(amount / 100).toLocaleString('en-IN')}`;

  const chartData = (revenueTrend || []).map(item => ({
    date: format(new Date(item.date), 'MMM d'),
    revenue: item.revenue / 100,
    payments: item.payment_count,
  }));

  // Build plan breakdown from actual active plans + payment data matched by price
  const planBreakdown = (activePlans || []).map((plan, i) => {
    const priceInPaise = plan.price_inr * 100;
    const stats = planCounts?.[priceInPaise] || { count: 0, revenue: 0 };
    const label = plan.display_name || plan.plan_name;
    const price = `₹${plan.price_inr}`;
    return {
      name: `${label} (${price})`,
      shortName: label,
      price,
      value: stats.count,
      revenue: stats.revenue,
      tier: plan.tier,
      color: PLAN_COLORS[i % PLAN_COLORS.length],
    };
  });
  const planBreakdownWithData = planBreakdown.filter(p => p.value > 0);

  const monthChange = revenue.lastMonthRevenue > 0 
    ? ((revenue.thisMonthRevenue - revenue.lastMonthRevenue) / revenue.lastMonthRevenue * 100).toFixed(1)
    : null;

  return (
    <div className="space-y-3">
      {/* Revenue KPIs - Compact */}
      <div className="grid grid-cols-4 gap-1.5">
        <MiniRevCard icon={<IndianRupee className="h-3 w-3" />} label="Total" value={formatAmount(revenue.totalRevenue)} />
        <MiniRevCard icon={<TrendingUp className="h-3 w-3" />} label="This Month" value={formatAmount(revenue.thisMonthRevenue)} subValue={monthChange ? `${monthChange}%` : undefined} positive={monthChange ? Number(monthChange) >= 0 : undefined} />
        <MiniRevCard icon={<CheckCircle className="h-3 w-3" />} label="Payments" value={String(revenue.successfulPayments)} />
        <MiniRevCard icon={<CreditCard className="h-3 w-3" />} label="AOV" value={revenue.successfulPayments > 0 ? formatAmount(Math.round(revenue.totalRevenue / revenue.successfulPayments)) : '₹0'} />
      </div>

      {/* Revenue Trend */}
      <Card>
        <CardHeader className="py-2 px-3">
          <CardTitle className="text-xs">Revenue Trend (30d)</CardTitle>
        </CardHeader>
        <CardContent className="pb-2 px-3">
          <div className="h-[160px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" tick={{ fontSize: 9 }} tickLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 9 }} tickLine={false} tickFormatter={(v) => `₹${v}`} />
                <Tooltip 
                  formatter={(value: number) => [`₹${value}`, 'Revenue']}
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '11px' }}
                />
                <Line type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Plan Distribution + Revenue side by side */}
      <div className="grid grid-cols-2 gap-2">
        <Card>
          <CardHeader className="py-2 px-3">
            <CardTitle className="text-xs">Plan Distribution</CardTitle>
          </CardHeader>
          <CardContent className="pb-2 px-3">
            {planBreakdownWithData.length > 0 ? (
              <>
                <div className="h-[120px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={planBreakdownWithData} cx="50%" cy="50%" innerRadius={30} outerRadius={50} paddingAngle={2} dataKey="value">
                        {planBreakdownWithData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value: number, name: string) => [value, name]}
                        contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '10px' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-0.5 mt-1">
                  {planBreakdownWithData.map((item, i) => (
                    <div key={i} className="flex items-center justify-between text-[10px]">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                        <span className="truncate">{item.name}</span>
                      </div>
                      <span className="font-medium shrink-0 ml-1">{item.value}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="h-[120px] flex items-center justify-center text-muted-foreground text-xs">No data</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="py-2 px-3">
            <CardTitle className="text-xs">Plan Revenue</CardTitle>
          </CardHeader>
          <CardContent className="pb-2 px-3 space-y-1.5">
            {planBreakdownWithData.length > 0 ? planBreakdownWithData.map((item, i) => (
              <div key={i} className="p-1.5 rounded-md border" style={{ borderLeftColor: item.color, borderLeftWidth: '3px' }}>
                <p className="text-[10px] text-muted-foreground truncate">{item.shortName} ({item.price})</p>
                <p className="text-sm font-bold">{formatAmount(item.revenue)}</p>
                <p className="text-[9px] text-muted-foreground">{item.value} subscriptions</p>
              </div>
            )) : (
              <div className="flex items-center justify-center h-[120px] text-muted-foreground text-xs">No data</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Payments */}
      <Card>
        <CardHeader className="py-2 px-3">
          <CardTitle className="text-xs flex items-center justify-between">
            Recent Payments
            <Badge variant="secondary" className="text-[10px]">{recentPayments.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-2 px-3">
          <ScrollArea className="h-[200px]">
            <div className="space-y-1">
              {recentPayments.length === 0 ? (
                <p className="text-center text-muted-foreground text-xs py-4">No payments yet</p>
              ) : recentPayments.map((payment) => (
                <div key={payment.id} className="flex items-center justify-between p-1.5 rounded-md border text-xs">
                  <div className="flex-1 min-w-0">
                    <p className="truncate font-medium text-[11px]">{payment.user_display_name || payment.user_email || 'Unknown'}</p>
                    <p className="text-[9px] text-muted-foreground">{format(new Date(payment.created_at), 'MMM d, h:mm a')}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-medium text-[11px]">{payment.amount ? formatAmount(payment.amount) : '-'}</span>
                    {payment.status === 'success' ? (
                      <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                    ) : (
                      <XCircle className="h-3.5 w-3.5 text-red-500" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

function MiniRevCard({ icon, label, value, subValue, positive }: {
  icon: React.ReactNode; label: string; value: string; subValue?: string; positive?: boolean;
}) {
  return (
    <Card>
      <CardContent className="p-2 text-center">
        <div className="text-muted-foreground mb-0.5">{icon}</div>
        <p className="text-sm font-bold leading-tight">{value}</p>
        <p className="text-[9px] text-muted-foreground">{label}</p>
        {subValue && (
          <p className={`text-[9px] font-medium ${positive ? 'text-green-600' : 'text-red-500'}`}>{subValue}</p>
        )}
      </CardContent>
    </Card>
  );
}
