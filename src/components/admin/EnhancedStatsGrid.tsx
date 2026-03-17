import { useState } from 'react';
import { 
  Users, Crown, UserCheck, Calendar, TrendingUp, Upload,
  IndianRupee, AlertTriangle, Phone, Gem, ArrowUp, ArrowDown
} from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { ProUserDrawer, FreeUserDrawer } from './UserListDrawer';
import { useProUsers, useFreeUsers, useExpiringSubscriptions, RevenueStats, ActiveUsageStats, ConversionAnalytics } from '@/hooks/useAdminAnalytics';
import { format, differenceInDays } from 'date-fns';

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
  newSignupsThisMonth: number;
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

// Paid Users drawer with Basic/Pro tabs
function PaidUsersDrawer({ open, onOpenChange, users, loading }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  users: Array<{
    user_id: string; display_name: string | null; email: string | null; neverai_id: string | null;
    plan: string; subscribed_at: string | null; expires_at: string | null;
    is_admin_override: boolean; is_expired: boolean; days_remaining: number | null; payment_amount: number | null;
    tier?: string;
  }>;
  loading: boolean;
}) {
  // Split by tier: tier='premium' → Pro display, else → Basic display
  const basicUsers = users.filter(u => u.tier !== 'premium');
  const proUsers = users.filter(u => u.tier === 'premium');

  const formatAmount = (amount: number | null) => amount ? `₹${(amount / 100).toLocaleString('en-IN')}` : null;

  const renderUserRow = (user: typeof users[0], index: number) => {
    const daysLeft = user.expires_at ? differenceInDays(new Date(user.expires_at), new Date()) : null;
    return (
      <TableRow key={user.user_id}>
        <TableCell className="py-2 text-[11px] text-muted-foreground">{index + 1}</TableCell>
        <TableCell className="py-2">
          <div className="text-sm font-medium truncate max-w-[140px]">{user.display_name || 'Unnamed'}</div>
          <div className="text-[10px] text-muted-foreground truncate max-w-[160px]">{user.email}</div>
        </TableCell>
        <TableCell className="py-2 text-[11px]">
          {user.is_admin_override ? (
            <Badge variant="outline" className="text-[9px] bg-purple-500/10 text-purple-600 px-1 py-0">Admin</Badge>
          ) : user.payment_amount ? (
            <span className="text-green-600">{formatAmount(user.payment_amount)}</span>
          ) : '—'}
        </TableCell>
        <TableCell className="py-2 text-[11px]">
          {user.expires_at ? format(new Date(user.expires_at), 'MMM d, yy') : 'No Expiry'}
        </TableCell>
        <TableCell className="py-2 text-[11px]">
          {user.is_expired ? (
            <Badge variant="destructive" className="text-[9px] px-1 py-0">Expired</Badge>
          ) : daysLeft !== null ? (
            <span className={daysLeft < 7 ? 'text-yellow-600 font-medium' : 'text-muted-foreground'}>{daysLeft}d</span>
          ) : <span className="text-green-600">∞</span>}
        </TableCell>
      </TableRow>
    );
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-yellow-500" />
            Paid Users
            <Badge variant="secondary">{users.length}</Badge>
          </SheetTitle>
        </SheetHeader>
        <Tabs defaultValue="basic" className="mt-4">
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="basic" className="text-xs gap-1">
              <Crown className="h-3 w-3" /> Basic <Badge variant="secondary" className="ml-1 text-[10px] px-1">{basicUsers.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="pro" className="text-xs gap-1">
              <Gem className="h-3 w-3" /> Pro <Badge variant="secondary" className="ml-1 text-[10px] px-1">{proUsers.length}</Badge>
            </TabsTrigger>
          </TabsList>
          {['basic', 'pro'].map(tab => (
            <TabsContent key={tab} value={tab}>
              <ScrollArea className="h-[calc(100vh-200px)]">
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-[10px] w-8">#</TableHead>
                        <TableHead className="text-[10px]">User</TableHead>
                        <TableHead className="text-[10px]">Paid</TableHead>
                        <TableHead className="text-[10px]">Expiry</TableHead>
                        <TableHead className="text-[10px]">Left</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(tab === 'basic' ? basicUsers : proUsers).map((u, i) => renderUserRow(u, i))}
                      {(tab === 'basic' ? basicUsers : proUsers).length === 0 && (
                        <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No users</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                )}
              </ScrollArea>
            </TabsContent>
          ))}
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}

// Expiring Users drawer with month-wise grouping
function ExpiringUsersDrawer({ open, onOpenChange }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  // Fetch expiring in next 90 days to show month-wise
  const { data: expiringUsers, isLoading } = useExpiringSubscriptions(90);

  // Group by month
  const grouped: Record<string, typeof expiringUsers> = {};
  (expiringUsers || []).forEach(u => {
    const monthKey = format(new Date(u.expires_at), 'MMMM yyyy');
    if (!grouped[monthKey]) grouped[monthKey] = [];
    grouped[monthKey]!.push(u);
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            Expiring Subscriptions
            <Badge variant="secondary">{expiringUsers?.length || 0}</Badge>
          </SheetTitle>
        </SheetHeader>
        <ScrollArea className="h-[calc(100vh-100px)] mt-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
            </div>
          ) : Object.keys(grouped).length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No expiring subscriptions in next 90 days</div>
          ) : (
            <div className="space-y-4">
              {Object.entries(grouped).map(([month, users]) => (
                <div key={month}>
                  <div className="flex items-center gap-2 mb-2 sticky top-0 bg-background py-1 z-10">
                    <h4 className="text-sm font-semibold">{month}</h4>
                    <Badge variant="outline" className="text-[10px]">{users!.length}</Badge>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-[10px] w-8">#</TableHead>
                        <TableHead className="text-[10px]">User</TableHead>
                        <TableHead className="text-[10px]">Plan</TableHead>
                        <TableHead className="text-[10px]">Expires</TableHead>
                        <TableHead className="text-[10px]">Days Left</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users!.map((u, i) => (
                        <TableRow key={u.user_id}>
                          <TableCell className="py-2 text-[11px] text-muted-foreground">{i + 1}</TableCell>
                          <TableCell className="py-2">
                            <div className="text-sm font-medium truncate max-w-[120px]">{u.display_name || 'Unnamed'}</div>
                            <div className="text-[10px] text-muted-foreground truncate max-w-[140px]">{u.email}</div>
                          </TableCell>
                          <TableCell className="py-2">
                            {u.plan === 'premium' || u.plan === 'Pro' ? (
                              <Badge className="bg-amber-500/20 text-amber-700 border-0 text-[10px] px-1.5 py-0 gap-0.5"><Gem className="h-2.5 w-2.5" />Pro</Badge>
                            ) : (
                              <Badge className="bg-primary/20 text-primary border-0 text-[10px] px-1.5 py-0 gap-0.5"><Crown className="h-2.5 w-2.5" />Basic</Badge>
                            )}
                          </TableCell>
                          <TableCell className="py-2 text-[11px]">{format(new Date(u.expires_at), 'MMM d, yy')}</TableCell>
                          <TableCell className="py-2">
                            <span className={`text-[11px] font-medium ${u.days_remaining <= 3 ? 'text-destructive' : u.days_remaining <= 7 ? 'text-yellow-600' : 'text-muted-foreground'}`}>
                              {u.days_remaining}d
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

export function EnhancedStatsGrid({
  totalSignups, activeProUsers, freeUsersCount,
  neveraiTodayActive, neveraiWeekActive,
  totalLeads, todayLeads, revenue, activeUsage, conversion,
  newSignupsThisMonth,
}: EnhancedStatsGridProps) {
  const [paidDrawerOpen, setPaidDrawerOpen] = useState(false);
  const [freeDrawerOpen, setFreeDrawerOpen] = useState(false);
  const [expiringDrawerOpen, setExpiringDrawerOpen] = useState(false);
  
  const { data: proUsers, isLoading: proLoading } = useProUsers();
  const { data: freeUsersData, isLoading: freeLoading } = useFreeUsers();
  const { data: expiringUsers } = useExpiringSubscriptions(7);
  
  const freeUsers = freeUsersData?.users || [];
  const formatRevenue = (amount: number) => `₹${(amount / 100).toLocaleString('en-IN')}`;

  // Split paid users into Basic vs Pro for the KPI
  const paidUsers = proUsers || [];
  const basicCount = paidUsers.filter(u => (u as any).tier !== 'premium').length;
  const proCount = paidUsers.filter(u => (u as any).tier === 'premium').length;

  return (
    <>
      {/* Row 1: Core User Metrics */}
      <div className="grid grid-cols-3 gap-1.5">
        <MiniStat label="Total Users" value={totalSignups.toLocaleString()} icon={<Users className="h-3.5 w-3.5" />} subValue={`${neveraiWeekActive} wk`} />
        <MiniStat 
          label="Paid" 
          value={activeProUsers} 
          icon={<Crown className="h-3.5 w-3.5 text-yellow-500" />} 
          onClick={() => setPaidDrawerOpen(true)} 
          accent="primary"
          subValue={`B:${basicCount} P:${proCount}`}
        />
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
        <MiniStat 
          label="Expiring" 
          value={expiringUsers?.length || 0} 
          icon={<AlertTriangle className="h-3.5 w-3.5 text-yellow-500" />} 
          accent={expiringUsers && expiringUsers.length > 0 ? 'amber' : undefined} 
          subValue="7d"
          onClick={() => setExpiringDrawerOpen(true)}
        />
      </div>

      <PaidUsersDrawer
        open={paidDrawerOpen}
        onOpenChange={setPaidDrawerOpen}
        users={(proUsers || []).map(u => ({
          user_id: u.user_id, display_name: u.display_name, email: u.email, neverai_id: u.neverai_id,
          plan: u.plan, subscribed_at: u.subscribed_at, expires_at: u.expires_at,
          is_admin_override: u.is_admin_override, is_expired: u.is_expired,
          days_remaining: u.days_remaining, payment_amount: u.payment_amount,
          tier: (u as any).tier,
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

      <ExpiringUsersDrawer
        open={expiringDrawerOpen}
        onOpenChange={setExpiringDrawerOpen}
      />
    </>
  );
}
