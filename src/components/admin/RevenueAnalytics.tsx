import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useRevenueTrend, RevenueStats, PaymentLog } from '@/hooks/useAdminAnalytics';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { IndianRupee, TrendingUp, TrendingDown, CreditCard, CheckCircle, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';

interface RevenueAnalyticsProps {
  revenue: RevenueStats;
  recentPayments: PaymentLog[];
}

export function RevenueAnalytics({ revenue, recentPayments }: RevenueAnalyticsProps) {
  const { data: revenueTrend } = useRevenueTrend(30);

  const formatAmount = (amount: number) => {
    return `₹${(amount / 100).toLocaleString('en-IN')}`;
  };

  // Prepare chart data
  const chartData = (revenueTrend || []).map(item => ({
    date: format(new Date(item.date), 'MMM d'),
    revenue: item.revenue / 100,
    payments: item.payment_count,
  }));

  // Pie chart data for plan breakdown (both are Pro with different durations)
  const planBreakdown = [
    { name: 'Pro Monthly (₹99)', value: revenue.monthlyPlanCount, color: 'hsl(var(--primary))' },
    { name: 'Pro 4-Month (₹299)', value: revenue.quarterlyPlanCount, color: 'hsl(var(--chart-2))' },
  ].filter(item => item.value > 0);

  const monthChange = revenue.lastMonthRevenue > 0 
    ? ((revenue.thisMonthRevenue - revenue.lastMonthRevenue) / revenue.lastMonthRevenue * 100).toFixed(1)
    : null;

  return (
    <div className="space-y-4">
      {/* Revenue KPI Cards */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs">
              <IndianRupee className="h-3 w-3" />
              Total Revenue
            </div>
            <p className="text-2xl font-bold mt-1">{formatAmount(revenue.totalRevenue)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs">
              <TrendingUp className="h-3 w-3" />
              This Month
            </div>
            <p className="text-2xl font-bold mt-1">{formatAmount(revenue.thisMonthRevenue)}</p>
            {monthChange && (
              <div className={`flex items-center gap-1 text-xs mt-1 ${Number(monthChange) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {Number(monthChange) >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {monthChange}% vs last month
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs">
              <CheckCircle className="h-3 w-3" />
              Successful Payments
            </div>
            <p className="text-2xl font-bold mt-1">{revenue.successfulPayments}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs">
              <CreditCard className="h-3 w-3" />
              Avg. Order Value
            </div>
            <p className="text-2xl font-bold mt-1">
              {revenue.successfulPayments > 0 
                ? formatAmount(Math.round(revenue.totalRevenue / revenue.successfulPayments))
                : '₹0'
              }
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Trend Chart */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm">Revenue Trend (30 Days)</CardTitle>
        </CardHeader>
        <CardContent className="pb-3">
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 10 }} 
                  tickLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis 
                  tick={{ fontSize: 10 }} 
                  tickLine={false}
                  tickFormatter={(value) => `₹${value}`}
                />
                <Tooltip 
                  formatter={(value: number) => [`₹${value}`, 'Revenue']}
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px'
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Plan Breakdown */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm">Plan Distribution</CardTitle>
          </CardHeader>
          <CardContent className="pb-3">
            {planBreakdown.length > 0 ? (
              <div className="h-[150px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={planBreakdown}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={60}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {planBreakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: number, name: string) => [value, name]}
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        fontSize: '12px'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[150px] flex items-center justify-center text-muted-foreground text-sm">
                No payment data
              </div>
            )}
            <div className="flex flex-col gap-1 mt-2 text-xs">
              {planBreakdown.map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                    <span>{item.name}</span>
                  </div>
                  <span className="font-medium">{item.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm">Plan Revenue</CardTitle>
          </CardHeader>
          <CardContent className="pb-3 space-y-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <p className="text-xs text-muted-foreground">Pro Monthly (₹99)</p>
              <p className="font-bold">{formatAmount(revenue.monthlyPlanRevenue)}</p>
              <p className="text-xs text-muted-foreground">{revenue.monthlyPlanCount} subscriptions</p>
            </div>
            <div className="p-2 rounded-lg bg-chart-2/10">
              <p className="text-xs text-muted-foreground">Pro 4-Month (₹299)</p>
              <p className="font-bold">{formatAmount(revenue.quarterlyPlanRevenue)}</p>
              <p className="text-xs text-muted-foreground">{revenue.quarterlyPlanCount} subscriptions</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Payments */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm flex items-center justify-between">
            Recent Payments
            <Badge variant="secondary" className="text-xs">{recentPayments.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-3">
          <ScrollArea className="h-[250px]">
            <div className="space-y-2">
              {recentPayments.length === 0 ? (
                <p className="text-center text-muted-foreground text-sm py-4">No payments yet</p>
              ) : (
                recentPayments.map((payment) => (
                  <div key={payment.id} className="flex items-center justify-between p-2 rounded-lg border text-sm">
                    <div className="flex-1 min-w-0">
                      <p className="truncate font-medium">
                        {payment.user_display_name || payment.user_email || 'Unknown'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {payment.user_display_name && payment.user_email && (
                          <span className="block truncate">{payment.user_email}</span>
                        )}
                        {format(new Date(payment.created_at), 'MMM d, h:mm a')}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {payment.amount ? formatAmount(payment.amount) : '-'}
                      </span>
                      {payment.status === 'success' ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
