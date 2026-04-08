import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

const COLORS: Record<string, string> = {
  free: 'hsl(var(--muted-foreground))',
  basic: 'hsl(var(--primary))',
  pro: 'hsl(var(--primary))',
  premium: 'hsl(45 93% 47%)',
  expired: 'hsl(0 84% 60%)',
};

const LABELS: Record<string, string> = {
  free: 'Free',
  basic: 'Active Basic',
  pro: 'Active Basic',
  premium: 'Active Pro',
  expired: 'Expired',
};

function useTierBreakdown() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['admin-tier-breakdown', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('admin_get_tier_breakdown' as any);
      if (error) throw error;
      return (data || []) as Array<{ tier_value: string; total_count: number; active_count: number; expired_count: number }>;
    },
    enabled: !!user,
    staleTime: 2 * 60 * 1000,
  });
}

export function SubscriptionPieChart() {
  const { data: tiers, isLoading } = useTierBreakdown();

  if (isLoading) {
    return (
      <div className="rounded-xl bg-card border border-border/50 p-4 flex items-center justify-center h-[300px]">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const chartData: Array<{ name: string; value: number; color: string }> = [];
  let totalExpired = 0;

  (tiers || []).forEach(t => {
    if (t.tier_value === 'free') {
      chartData.push({ name: 'Free', value: Number(t.active_count), color: COLORS.free });
    } else if (t.tier_value === 'basic' || t.tier_value === 'pro') {
      // Both 'basic' and 'pro' tier values map to "Pro" display name
      const existing = chartData.find(d => d.name === 'Active Pro');
      if (existing) {
        existing.value += Number(t.active_count);
      } else {
        chartData.push({ name: 'Active Pro', value: Number(t.active_count), color: COLORS.pro });
      }
      totalExpired += Number(t.expired_count);
    } else if (t.tier_value === 'premium') {
      const existing = chartData.find(d => d.name === 'Active Pro');
      if (existing) {
        existing.value += Number(t.active_count);
      } else {
        chartData.push({ name: 'Active Pro', value: Number(t.active_count), color: COLORS.premium });
      }
      totalExpired += Number(t.expired_count);
    }
  });

  if (totalExpired > 0) {
    chartData.push({ name: 'Expired', value: totalExpired, color: COLORS.expired });
  }

  const filteredData = chartData.filter(d => d.value > 0);
  const total = filteredData.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="rounded-xl bg-card border border-border/50 p-4">
      <h4 className="text-sm font-medium mb-3">Subscription Distribution</h4>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={filteredData}
              cx="50%"
              cy="45%"
              innerRadius={50}
              outerRadius={80}
              paddingAngle={2}
              dataKey="value"
              label={({ value }) => `${value}`}
              labelLine={false}
            >
              {filteredData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} stroke="hsl(var(--card))" strokeWidth={2} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                fontSize: '12px'
              }}
              formatter={(value: number, name: string) => [
                `${value} (${total > 0 ? ((value / total) * 100).toFixed(1) : 0}%)`,
                name
              ]}
            />
            <Legend
              verticalAlign="bottom"
              height={36}
              formatter={(value: string) => <span className="text-xs text-foreground">{value}</span>}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3">
        {filteredData.map((item) => (
          <div key={item.name} className="text-center p-2 rounded-lg bg-muted/30">
            <div className="w-3 h-3 rounded-full mx-auto mb-1" style={{ backgroundColor: item.color }} />
            <p className="text-xs font-medium">{item.value}</p>
            <p className="text-[10px] text-muted-foreground">{item.name}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
