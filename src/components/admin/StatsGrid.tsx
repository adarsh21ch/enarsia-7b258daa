import { TrendingUp, Calendar, CalendarDays, IndianRupee } from 'lucide-react';

interface StatsGridProps {
  todaySignups: number;
  weekSignups: number;
  monthSignups: number;
  totalRevenue: number;
}

export function StatsGrid({ todaySignups, weekSignups, monthSignups, totalRevenue }: StatsGridProps) {
  const formatCurrency = (amount: number) => {
    if (amount >= 100000) {
      return `₹${(amount / 100000).toFixed(1)}L`;
    } else if (amount >= 1000) {
      return `₹${(amount / 1000).toFixed(1)}K`;
    }
    return `₹${amount}`;
  };

  const stats = [
    {
      label: 'Today',
      value: todaySignups,
      icon: Calendar,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10'
    },
    {
      label: '7 Days',
      value: weekSignups,
      icon: CalendarDays,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10'
    },
    {
      label: '30 Days',
      value: monthSignups,
      icon: TrendingUp,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10'
    },
    {
      label: 'Revenue',
      value: formatCurrency(totalRevenue),
      icon: IndianRupee,
      color: 'text-amber-500',
      bgColor: 'bg-amber-500/10'
    }
  ];

  return (
    <div className="grid grid-cols-4 gap-2">
      {stats.map((stat) => (
        <div 
          key={stat.label}
          className="rounded-xl p-3 bg-card border border-border/50 text-center"
        >
          <div className={`inline-flex items-center justify-center w-8 h-8 rounded-lg ${stat.bgColor} mb-2`}>
            <stat.icon className={`h-4 w-4 ${stat.color}`} />
          </div>
          <p className="text-lg font-bold">{stat.value}</p>
          <p className="text-[10px] text-muted-foreground">{stat.label}</p>
        </div>
      ))}
    </div>
  );
}
