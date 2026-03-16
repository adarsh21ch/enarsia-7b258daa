import { useState } from 'react';
import { 
  Users, Crown, UserCheck, Calendar, TrendingUp, Upload,
  IndianRupee, AlertTriangle, Phone, Gem, ArrowUp, ArrowDown
} from 'lucide-react';
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

function MiniStat({ 
  label, value, icon, subValue, onClick, accent 
}: { 
  label: string; 
  value: string | number; 
  icon: React.ReactNode; 
  subValue?: string; 
  onClick?: () => void;
  accent?: 'primary' | 'green' | 'amber' | 'red';
}) {
  const accentBorder = {
    primary: 'border-l-primary',
    green: 'border-l-green-500',
    amber: 'border-l-amber-500',
    red: 'border-l-red-500',
  };

  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border bg-card text-left transition-all w-full
        ${accent ? `border-l-[3px] ${accentBorder[accent]}` : 'border-border/50'}
        ${onClick ? 'cursor-pointer hover:bg-muted/50 hover:shadow-sm' : 'cursor-default'}`}
    >
      <div className="shrink-0 text-muted-foreground">{icon}</div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] text-muted-foreground truncate">{label}</p>
        <p className="text-sm font-bold leading-tight">{value}</p>
      </div>
      {subValue && (
        <span className="text-[9px] text-muted-foreground whitespace-nowrap shrink-0">{subValue}</span>
      )}
    </button>
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
      {/* Row 1: Core User Metrics */}
      <div className="grid grid-cols-3 gap-1.5">
        <MiniStat label="Total Users" value={totalSignups.toLocaleString()} icon={<Users className="h-3.5 w-3.5" />} subValue={`${neveraiWeekActive} wk`} />
        <MiniStat label="Paid" value={activeProUsers} icon={<Crown className="h-3.5 w-3.5 text-yellow-500" />} onClick={() => setProDrawerOpen(true)} accent="primary" />
        <MiniStat label="Free" value={freeUsersCount.toLocaleString()} icon={<UserCheck className="h-3.5 w-3.5" />} onClick={() => setFreeDrawerOpen(true)} />
      </div>

      {/* Row 2: Activity + Usage */}
      <div className="grid grid-cols-4 gap-1.5">
        <MiniStat label="Today Active" value={neveraiTodayActive} icon={<Calendar className="h-3.5 w-3.5" />} />
        <MiniStat label="Importers" value={activeUsage.leadsImportersToday} icon={<Upload className="h-3.5 w-3.5 text-blue-500" />} subValue={`${activeUsage.leadsImportersWeek} wk`} accent="green" />
        <MiniStat label="Callers" value={activeUsage.activeCallersToday} icon={<Phone className="h-3.5 w-3.5 text-green-500" />} subValue={`${activeUsage.activeCallersWeek} wk`} accent="green" />
        <MiniStat label="Conversion" value={`${conversion?.conversionRate || 0}%`} icon={<TrendingUp className="h-3.5 w-3.5 text-blue-500" />} subValue={`${conversion?.conversionsThisMonth || 0}/mo`} />
      </div>

      {/* Row 3: Leads + Revenue */}
      <div className="grid grid-cols-4 gap-1.5">
        <MiniStat label="Total Leads" value={totalLeads.toLocaleString()} icon={<TrendingUp className="h-3.5 w-3.5" />} />
        <MiniStat label="Today Leads" value={todayLeads} icon={<TrendingUp className="h-3.5 w-3.5" />} />
        <MiniStat label="Revenue" value={formatRevenue(revenue.totalRevenue)} icon={<IndianRupee className="h-3.5 w-3.5 text-green-600" />} subValue={`${revenue.successfulPayments} pay`} accent="primary" />
        <MiniStat label="Expiring" value={expiringUsers?.length || 0} icon={<AlertTriangle className="h-3.5 w-3.5 text-yellow-500" />} accent={expiringUsers && expiringUsers.length > 0 ? 'amber' : undefined} subValue="7d" />
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
