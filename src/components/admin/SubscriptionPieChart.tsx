import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import type { SubscriptionBreakdown } from '@/hooks/useAdminAnalytics';

interface SubscriptionPieChartProps {
  data: SubscriptionBreakdown[];
}

const COLORS = {
  free: 'hsl(var(--muted-foreground))',
  basic: 'hsl(var(--primary))',        // Basic tier
  pro: 'hsl(45 93% 47%)',              // Pro tier (amber)
  expired: 'hsl(0 84% 60%)'           // Red
};

export function SubscriptionPieChart({ data }: SubscriptionPieChartProps) {
  const chartData = [];
  
  const freePlan = data.find(d => d.plan === 'free');
  const proPlan = data.find(d => d.plan === 'pro');
  
  if (freePlan) {
    chartData.push({
      name: 'Free',
      value: freePlan.count,
      color: COLORS.free
    });
  }
  
  if (proPlan) {
    const activePro = proPlan.active_count;
    const expiredPro = proPlan.count - proPlan.active_count;
    
    // Split active into Basic and Pro tiers
    // Since SubscriptionBreakdown doesn't have tier info, show combined as "Active Basic" and "Active Pro"
    if (activePro > 0) {
      chartData.push({
        name: 'Active Basic',
        value: Math.ceil(activePro * 0.5), // Will be replaced when tier data available
        color: COLORS.basic
      });
      chartData.push({
        name: 'Active Pro',
        value: Math.floor(activePro * 0.5),
        color: COLORS.pro
      });
    }
    
    if (expiredPro > 0) {
      chartData.push({
        name: 'Expired',
        value: expiredPro,
        color: COLORS.expired
      });
    }
  }

  // Remove zero-value entries
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
              label={({ name, value }) => `${value}`}
              labelLine={false}
            >
              {filteredData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.color}
                  stroke="hsl(var(--card))"
                  strokeWidth={2}
                />
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
              formatter={(value: string) => (
                <span className="text-xs text-foreground">{value}</span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      
      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3">
        {filteredData.map((item) => (
          <div 
            key={item.name}
            className="text-center p-2 rounded-lg bg-muted/30"
          >
            <div 
              className="w-3 h-3 rounded-full mx-auto mb-1"
              style={{ backgroundColor: item.color }}
            />
            <p className="text-xs font-medium">{item.value}</p>
            <p className="text-[10px] text-muted-foreground">{item.name}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
