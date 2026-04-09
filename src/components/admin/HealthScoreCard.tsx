import { format } from 'date-fns';
import { Activity, AlertTriangle, X, TrendingDown, Timer, Users } from 'lucide-react';
import { useState } from 'react';
import { AdminAnalytics } from '@/hooks/useAdminAnalytics';

type HealthLevel = 'good' | 'warning' | 'alert';

interface Alert {
  id: string;
  message: string;
  type: 'revenue' | 'trial' | 'dau';
}

function computeHealth(analytics: AdminAnalytics): { level: HealthLevel; alerts: Alert[] } {
  const alerts: Alert[] = [];
  const dau = analytics.neveraiTodayActive;
  const revenue = analytics.revenue;
  const revenueChangePercent = revenue.lastMonthRevenue > 0
    ? Math.round(((revenue.thisMonthRevenue - revenue.lastMonthRevenue) / revenue.lastMonthRevenue) * 100)
    : 0;

  if (revenueChangePercent < -50 && revenue.lastMonthRevenue > 0) {
    alerts.push({
      id: 'revenue-drop',
      message: `Revenue down ${Math.abs(revenueChangePercent)}% this month vs last month`,
      type: 'revenue',
    });
  }

  if (dau < 5) {
    alerts.push({
      id: 'dau-low',
      message: `DAU dropped to ${dau} — lowest engagement`,
      type: 'dau',
    });
  }

  let level: HealthLevel = 'good';
  if (dau === 0) level = 'alert';
  else if (dau < 5 || revenueChangePercent < -50) level = 'warning';

  return { level, alerts };
}

const healthConfig = {
  good: {
    label: 'Good',
    emoji: '🟢',
    bg: 'bg-emerald-500/8 dark:bg-emerald-500/10',
    border: 'border-emerald-500/20',
    textColor: 'text-emerald-700 dark:text-emerald-400',
  },
  warning: {
    label: 'Needs Attention',
    emoji: '🟡',
    bg: 'bg-amber-500/8 dark:bg-amber-500/10',
    border: 'border-amber-500/20',
    textColor: 'text-amber-700 dark:text-amber-400',
  },
  alert: {
    label: 'Critical',
    emoji: '🔴',
    bg: 'bg-red-500/8 dark:bg-red-500/10',
    border: 'border-red-500/20',
    textColor: 'text-red-700 dark:text-red-400',
  },
};

interface HealthScoreCardProps {
  analytics: AdminAnalytics;
}

export function HealthScoreCard({ analytics }: HealthScoreCardProps) {
  const { level, alerts } = computeHealth(analytics);
  const config = healthConfig[level];
  const [dismissedAlerts, setDismissedAlerts] = useState<string[]>([]);
  const visibleAlerts = alerts.filter(a => !dismissedAlerts.includes(a.id));

  const todaySignups = analytics.dailySignups[analytics.dailySignups.length - 1]?.count || 0;
  const formatRevenue = (amt: number) => `₹${(amt / 100).toLocaleString('en-IN')}`;

  return (
    <div className="space-y-2">
      {/* Hero Health Card */}
      <div className={`rounded-2xl border ${config.border} ${config.bg} p-4`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-muted-foreground" />
            <span className={`text-sm font-bold font-heading ${config.textColor}`}>
              {config.emoji} App Health: {config.label}
            </span>
          </div>
          <span className="text-xs text-muted-foreground">
            Today, {format(new Date(), 'MMM d')}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-x-6 gap-y-2">
          <QuickStat label="New Signups today" value={todaySignups} />
          <QuickStat label="Active now (DAU)" value={analytics.neveraiTodayActive} />
          <QuickStat label="Revenue today" value={formatRevenue(0)} />
          <QuickStat label="Trials expiring" value={0} />
        </div>
      </div>

      {/* Alert Chips */}
      {visibleAlerts.length > 0 && (
        <div className="space-y-1.5">
          {visibleAlerts.map(alert => (
            <div
              key={alert.id}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-500/8 dark:bg-amber-500/10 border border-amber-500/20 text-sm"
            >
              <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
              <span className="flex-1 text-xs text-amber-800 dark:text-amber-300">{alert.message}</span>
              <button
                onClick={() => setDismissedAlerts(prev => [...prev, alert.id])}
                className="text-amber-600/60 hover:text-amber-800 transition-colors shrink-0"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function QuickStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-bold font-heading">{value}</span>
    </div>
  );
}
