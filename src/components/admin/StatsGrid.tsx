import { Users, TrendingUp, Calendar, Target, Activity, Database } from 'lucide-react';

interface StatsGridProps {
  neveraiTotalUsers: number;
  neveraiTodayActive: number;
  neveraiWeekActive: number;
  activeProUsers: number;
  totalLeads: number;
  todayLeads: number;
  weekLeads: number;
}

export function StatsGrid({
  neveraiTotalUsers,
  neveraiTodayActive,
  neveraiWeekActive,
  activeProUsers,
  totalLeads,
  todayLeads,
  weekLeads,
}: StatsGridProps) {
  const stats = [
    {
      label: 'Total Users',
      value: neveraiTotalUsers,
      icon: Users,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      label: 'DAU',
      value: neveraiTodayActive,
      icon: Activity,
      color: 'text-green-600',
      bgColor: 'bg-green-500/10',
    },
    {
      label: 'WAU',
      value: neveraiWeekActive,
      icon: TrendingUp,
      color: 'text-blue-600',
      bgColor: 'bg-blue-500/10',
    },
    {
      label: 'Active Pro',
      value: activeProUsers,
      icon: Target,
      color: 'text-amber-600',
      bgColor: 'bg-amber-500/10',
    },
    {
      label: 'Total Leads',
      value: totalLeads,
      icon: Database,
      color: 'text-purple-600',
      bgColor: 'bg-purple-500/10',
    },
    {
      label: 'Today Leads',
      value: todayLeads,
      icon: Calendar,
      color: 'text-cyan-600',
      bgColor: 'bg-cyan-500/10',
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-2">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="flex flex-col items-center justify-center p-3 rounded-xl bg-card border border-border/50"
        >
          <div className={`p-2 rounded-lg ${stat.bgColor} mb-2`}>
            <stat.icon className={`h-4 w-4 ${stat.color}`} />
          </div>
          <span className="text-lg font-bold">{stat.value.toLocaleString()}</span>
          <span className="text-[10px] text-muted-foreground text-center">{stat.label}</span>
        </div>
      ))}
    </div>
  );
}