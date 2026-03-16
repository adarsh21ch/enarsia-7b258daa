import { Card, CardContent } from '@/components/ui/card';
import { 
  Users, Crown, UserCheck, Calendar, TrendingUp, Upload,
  IndianRupee, AlertTriangle, Phone, Gem
} from 'lucide-react';
import { useState } from 'react';
import { ProUserDrawer, FreeUserDrawer } from './UserListDrawer';
import { useProUsers, useFreeUsers, useExpiringSubscriptions, RevenueStats, ActiveUsageStats, ConversionAnalytics } from '@/hooks/useAdminAnalytics';

interface EnhancedStatsGridProps {
  totalSignups: number;
  activeProUsers: number;
  freeUsersCount: number;
  neveraiTodayActive: number;
  neveraiWeekActive: number;
  totalLeads: number;
  todayLeads: number;
  revenue: RevenueStats;
  activeUsage: ActiveUsageStats;
  conversion?: ConversionAnalytics;
}

interface StatCardProps {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  subtext?: string;
  onClick?: () => void;
  highlight?: 'primary' | 'success' | 'warning' | 'danger';
}

function StatCard({ label, value, icon, subtext, onClick, highlight }: StatCardProps) {
  const highlightClasses = {
    primary: 'border-primary/30 bg-primary/5',
    success: 'border-green-500/30 bg-green-500/5',
    warning: 'border-yellow-500/30 bg-yellow-500/5',
    danger: 'border-red-500/30 bg-red-500/5',
  };

  return (
    <Card 
      className={`${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''} ${highlight ? highlightClasses[highlight] : ''}`}
      onClick={onClick}
    >
      <CardContent className="pt-3 pb-2.5 px-3">
        <div className="flex items-center gap-1.5 text-muted-foreground text-[11px]">
          {icon}
          <span className="truncate">{label}</span>
        </div>
        <p className="text-lg font-bold mt-0.5">{value}</p>
        {subtext && <p className="text-[10px] text-muted-foreground mt-0.5">{subtext}</p>}
      </CardContent>
    </Card>
  );
}

export function EnhancedStatsGrid({
  totalSignups, activeProUsers, freeUsersCount,
  neveraiTodayActive, neveraiWeekActive,
  totalLeads, todayLeads, revenue, activeUsage, conversion,
}: EnhancedStatsGridProps) {
  const [proDrawerOpen, setProDrawerOpen] = useState(false);
  const [freeDrawerOpen, setFreeDrawerOpen] = useState(false);
  
  const { data: proUsers, isLoading: proLoading } = useProUsers();
  const { data: freeUsersData, isLoading: freeLoading } = useFreeUsers();
  const { data: expiringUsers } = useExpiringSubscriptions(7);
  
  const freeUsers = freeUsersData?.users || [];

  const formatRevenue = (amount: number) => `₹${(amount / 100).toLocaleString('en-IN')}`;

  return (
    <>
      <div className="grid grid-cols-2 gap-2.5">
        <StatCard
          label="Total Users"
          value={totalSignups.toLocaleString()}
          icon={<Users className="h-3 w-3" />}
          subtext={`${neveraiWeekActive} active this week`}
        />
        <StatCard
          label="Paid Users"
          value={activeProUsers}
          icon={<Crown className="h-3 w-3 text-yellow-500" />}
          onClick={() => setProDrawerOpen(true)}
          highlight="primary"
          subtext="Tap to view list"
        />
        <StatCard
          label="Free Users"
          value={freeUsersCount.toLocaleString()}
          icon={<UserCheck className="h-3 w-3" />}
          onClick={() => setFreeDrawerOpen(true)}
          subtext="Tap to view list"
        />
        <StatCard
          label="Today Active"
          value={neveraiTodayActive}
          icon={<Calendar className="h-3 w-3" />}
          subtext="Logged in today"
        />
        <StatCard
          label="Lead Importers"
          value={activeUsage.leadsImportersToday}
          icon={<Upload className="h-3 w-3 text-blue-500" />}
          highlight="success"
          subtext={`${activeUsage.leadsImportersWeek} this week`}
        />
        <StatCard
          label="Active Callers"
          value={activeUsage.activeCallersToday}
          icon={<Phone className="h-3 w-3 text-green-500" />}
          highlight="success"
          subtext={`${activeUsage.activeCallersWeek} this week`}
        />
        <StatCard label="Total Leads" value={totalLeads.toLocaleString()} icon={<TrendingUp className="h-3 w-3" />} />
        <StatCard label="Today's Leads" value={todayLeads} icon={<TrendingUp className="h-3 w-3" />} />
        <StatCard
          label="Total Revenue"
          value={formatRevenue(revenue.totalRevenue)}
          icon={<IndianRupee className="h-3 w-3 text-green-600" />}
          highlight="primary"
          subtext={`${revenue.successfulPayments} payments`}
        />
        <StatCard
          label="Conversion Rate"
          value={`${conversion?.conversionRate || 0}%`}
          icon={<TrendingUp className="h-3 w-3 text-blue-500" />}
          highlight="success"
          subtext={`${conversion?.conversionsThisMonth || 0} this month`}
        />
        <StatCard
          label="Expiring Soon"
          value={expiringUsers?.length || 0}
          icon={<AlertTriangle className="h-3 w-3 text-yellow-500" />}
          highlight={expiringUsers && expiringUsers.length > 0 ? 'warning' : undefined}
          subtext="Within 7 days"
        />
      </div>

      <ProUserDrawer
        open={proDrawerOpen}
        onOpenChange={setProDrawerOpen}
        users={(proUsers || []).map(u => ({
          user_id: u.user_id, display_name: u.display_name, email: u.email, neverai_id: u.neverai_id,
          plan: u.plan, subscribed_at: u.subscribed_at, expires_at: u.expires_at,
          is_admin_override: u.is_admin_override, is_expired: u.is_expired,
          days_remaining: u.days_remaining, payment_amount: u.payment_amount,
        }))}
        loading={proLoading}
      />

      <FreeUserDrawer
        open={freeDrawerOpen}
        onOpenChange={setFreeDrawerOpen}
        users={freeUsers.map(u => ({ ...u }))}
        loading={freeLoading}
        totalCount={freeUsersData?.totalCount || 0}
      />
    </>
  );
}
