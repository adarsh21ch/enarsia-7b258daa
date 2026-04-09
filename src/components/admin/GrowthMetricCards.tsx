import { Users, TrendingUp, RefreshCw, Gem, ArrowUp, ArrowDown, Minus } from 'lucide-react';
import { AdminAnalytics, useRetentionAnalytics } from '@/hooks/useAdminAnalytics';
import { useState } from 'react';
import { ProUserDrawer, FreeUserDrawer } from './UserListDrawer';
import { useProUsers, useFreeUsers } from '@/hooks/useAdminAnalytics';

interface GrowthMetricCardsProps {
  analytics: AdminAnalytics;
}

function TrendPill({ value, suffix = '' }: { value: number; suffix?: string }) {
  if (value > 0) return (
    <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-full">
      <ArrowUp className="h-2.5 w-2.5" />↑ {value}{suffix}
    </span>
  );
  if (value < 0) return (
    <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-red-700 dark:text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded-full">
      <ArrowDown className="h-2.5 w-2.5" />↓ {Math.abs(value)}{suffix}
    </span>
  );
  return (
    <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
      <Minus className="h-2.5 w-2.5" />→ 0{suffix}
    </span>
  );
}

function EngagementLabel({ ratio }: { ratio: number }) {
  if (ratio >= 10) return <span className="text-[10px] font-medium text-emerald-600">🟢 Healthy</span>;
  if (ratio >= 5) return <span className="text-[10px] font-medium text-amber-600">🟡 Moderate</span>;
  return <span className="text-[10px] font-medium text-red-600">🔴 Low</span>;
}

export function GrowthMetricCards({ analytics }: GrowthMetricCardsProps) {
  const { data: retention } = useRetentionAnalytics();
  const { data: proUsers, isLoading: proLoading } = useProUsers();
  const { data: freeUsersData, isLoading: freeLoading } = useFreeUsers();
  const [paidDrawerOpen, setPaidDrawerOpen] = useState(false);
  const [freeDrawerOpen, setFreeDrawerOpen] = useState(false);

  const mau = retention?.mau || 0;
  const dau = retention?.dau || analytics.neveraiTodayActive;
  const dauMauRatio = mau > 0 ? Math.round((dau / mau) * 100) : 0;

  const paidUsers = proUsers || [];
  const basicCount = paidUsers.filter(u => (u as any).tier !== 'premium').length;
  const proCount = paidUsers.filter(u => (u as any).tier === 'premium').length;

  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        {/* Total Users */}
        <MetricCard
          icon={<Users className="h-4 w-4 text-primary" />}
          title="Total Users"
          value={analytics.totalSignups.toLocaleString()}
          sub={<TrendPill value={analytics.neveraiWeekActive} suffix=" this wk" />}
        />

        {/* This Week Growth */}
        <MetricCard
          icon={<TrendingUp className="h-4 w-4 text-emerald-600" />}
          title="This Month"
          value={`+${analytics.newSignupsThisMonth} new`}
          sub={
            <span className="text-xs text-muted-foreground">
              Conversion: <span className="font-semibold text-foreground">{analytics.conversion?.conversionRate || 0}%</span>
            </span>
          }
        />

        {/* Retention */}
        <MetricCard
          icon={<RefreshCw className="h-4 w-4 text-blue-600" />}
          title="Retention"
          value={`MAU: ${mau}`}
          sub={
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">DAU/MAU: {dauMauRatio}%</span>
              <EngagementLabel ratio={dauMauRatio} />
            </div>
          }
          warning={dauMauRatio < 5}
        />

        {/* Paid Users */}
        <MetricCard
          icon={<Gem className="h-4 w-4 text-amber-500" />}
          title="Paid Users"
          value={`${analytics.activeProUsers} active`}
          sub={
            <span className="text-xs text-muted-foreground">
              Basic: {basicCount} · Pro: {proCount}
            </span>
          }
          onClick={() => setPaidDrawerOpen(true)}
        />
      </div>

      {/* Drawers */}
      <ProUserDrawer
        open={paidDrawerOpen}
        onOpenChange={setPaidDrawerOpen}
      />
      {freeDrawerOpen && (
        <FreeUserDrawer
          open={freeDrawerOpen}
          onOpenChange={setFreeDrawerOpen}
          users={freeUsersData?.users || []}
          loading={freeLoading}
          totalCount={freeUsersData?.totalCount || 0}
        />
      )}
    </>
  );
}

function MetricCard({ icon, title, value, sub, warning, onClick }: {
  icon: React.ReactNode;
  title: string;
  value: string | number;
  sub: React.ReactNode;
  warning?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className={`text-left rounded-2xl border bg-card p-4 transition-all
        ${warning ? 'border-amber-500/30 bg-amber-500/5' : 'border-border/50'}
        ${onClick ? 'cursor-pointer hover:shadow-md hover:border-primary/30' : 'cursor-default'}`}
    >
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-xs text-muted-foreground font-medium">{title}</span>
      </div>
      <p className="text-2xl font-extrabold font-heading leading-tight mb-1">{value}</p>
      <div>{sub}</div>
      {warning && (
        <div className="mt-2 text-[10px] font-medium text-amber-600">⚠️ Low engagement</div>
      )}
    </button>
  );
}
