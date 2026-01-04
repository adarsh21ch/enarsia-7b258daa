import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import type { SubscriptionBreakdown } from '@/hooks/useAdminAnalytics';

interface SubscriptionPieChartProps {
  data: SubscriptionBreakdown[];
}

const COLORS = {
  free: 'hsl(var(--muted-foreground))',
  pro: 'hsl(45 93% 47%)', // Amber
  expired: 'hsl(0 84% 60%)' // Red
};

export function SubscriptionPieChart({ data }: SubscriptionPieChartProps) {
  // Transform data to show Free, Active Pro, and Expired Pro
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
    
    if (activePro > 0) {
      chartData.push({
        name: 'Active Pro',
        value: activePro,
        color: COLORS.pro
      });
    }
    
    if (expiredPro > 0) {
      chartData.push({
        name: 'Expired Pro',
        value: expiredPro,
        color: COLORS.expired
      });
    }
  }

  const total = chartData.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="rounded-xl bg-card border border-border/50 p-4">
      <h4 className="text-sm font-medium mb-3">Subscription Distribution</h4>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="45%"
              innerRadius={50}
              outerRadius={80}
              paddingAngle={2}
              dataKey="value"
              label={({ name, value }) => `${value}`}
              labelLine={false}
            >
              {chartData.map((entry, index) => (
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
                `${value} (${((value / total) * 100).toFixed(1)}%)`,
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
      <div className="grid grid-cols-3 gap-2 mt-3">
        {chartData.map((item) => (
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
