import { useState, useCallback, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger } from '@/components/ui/dropdown-menu';
import { Loader2, Search, Crown, Settings, MoreHorizontal, Copy, ChevronUp, ChevronDown, ArrowUpDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { differenceInDays, format } from 'date-fns';
import { UserOverrideDrawer } from './UserOverrideDrawer';
import { logAdminAction } from '@/hooks/useAuditLogs';
import { getTierDisplayName, type InternalTier } from '@/config/tierLabels';

interface EnhancedUsersTabProps {
  headerPlanFilter?: string;
}

interface EnhancedUser {
  user_id: string;
  email: string | null;
  display_name: string | null;
  neverai_id: string | null;
  plan: string;
  tier: string;
  is_admin_override: boolean;
  subscribed_at: string | null;
  expires_at: string | null;
  total_leads_count: number;
  source_app: string | null;
  last_active_at: string | null;
  is_suspended: boolean;
  created_at: string | null;
  trial_start_date: string | null;
}

const TRIAL_DURATION_DAYS = 7;

const PLAN_FILTER_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'active_pro', label: '✅ Active Pro' },
  { value: 'expired_pro', label: '⚠ Expired Pro' },
  { value: 'trial', label: '⏳ Trial' },
  { value: 'free', label: '🆓 Free' },
  { value: 'suspended', label: '⛔ Suspended' },
];

// True if a Pro subscription has elapsed its expires_at
function isExpiredPro(user: { plan: string; expires_at: string | null }) {
  return user.plan === 'pro' && !!user.expires_at && new Date(user.expires_at) < new Date();
}

const GRANT_OPTIONS = [
  { value: 'pro-30', label: 'Pro 30d', tier: 'pro', days: 30 },
  { value: 'pro-90', label: 'Pro 90d', tier: 'pro', days: 90 },
  { value: 'pro-120', label: 'Pro 120d', tier: 'pro', days: 120 },
  { value: 'pro-365', label: 'Pro 1yr', tier: 'pro', days: 365 },
];

type SortField = 'display_name' | 'total_leads_count' | 'created_at' | 'expires_at';
type SortDir = 'asc' | 'desc';

interface TierCounts {
  free: number;
  pro: number;
  total: number;
}

function TierChips({ counts, loading }: { counts: TierCounts; loading: boolean }) {
  if (loading) return <div className="flex gap-2"><Loader2 className="h-4 w-4 animate-spin" /></div>;
  return (
    <div className="flex gap-2 flex-wrap">
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted/60 border border-border/50">
        <span className="text-xs text-muted-foreground">Free</span>
        <span className="text-sm font-bold">{counts.free.toLocaleString()}</span>
      </div>
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/30">
        <Crown className="h-3 w-3 text-primary" />
        <span className="text-xs text-primary">Pro</span>
        <span className="text-sm font-bold text-primary">{counts.pro}</span>
      </div>
    </div>
  );
}

function TierBadge({ user }: { user: EnhancedUser }) {
  if (user.plan !== 'pro') return <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Free</Badge>;
  if (isExpiredPro(user)) {
    return <Badge variant="outline" className="text-[10px] px-1.5 py-0 gap-0.5 bg-destructive/10 text-destructive border-destructive/40">⚠ Expired</Badge>;
  }
  return <Badge className="bg-primary/20 text-primary border-0 text-[10px] px-1.5 py-0 gap-0.5"><Crown className="h-2.5 w-2.5" />Pro</Badge>;
}

function StatusBadge({ user }: { user: EnhancedUser }) {
  if (user.is_suspended) return <Badge variant="destructive" className="text-[10px] px-1.5 py-0">Suspended</Badge>;
  if (isExpiredPro(user)) return <Badge variant="outline" className="text-[10px] text-destructive border-destructive/40 px-1.5 py-0">Expired</Badge>;
  if (user.plan === 'pro') return <Badge variant="outline" className="text-[10px] text-green-600 border-green-500/40 px-1.5 py-0">Active</Badge>;
  const trialStart = user.trial_start_date || user.created_at;
  if (trialStart) {
    const daysSince = Math.floor((Date.now() - new Date(trialStart).getTime()) / (1000 * 60 * 60 * 24));
    if (daysSince < TRIAL_DURATION_DAYS) return <Badge variant="outline" className="text-[10px] text-primary border-primary/40 px-1.5 py-0">Trial Day {daysSince + 1}</Badge>;
  }
  return <Badge variant="outline" className="text-[10px] px-1.5 py-0">Free</Badge>;
}

function SortableHeader({ label, field, sortField, sortDir, onSort }: { label: string; field: SortField; sortField: SortField; sortDir: SortDir; onSort: (f: SortField) => void }) {
  const isActive = sortField === field;
  return (
    <TableHead className="cursor-pointer select-none hover:bg-muted/50 transition-colors" onClick={() => onSort(field)}>
      <div className="flex items-center gap-1">
        <span className="text-[11px]">{label}</span>
        {isActive ? (sortDir === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 opacity-30" />}
      </div>
    </TableHead>
  );
}

export function EnhancedUsersTab({ headerPlanFilter }: EnhancedUsersTabProps) {
  const queryClient = useQueryClient();
  const pageSize = 100;
  const [users, setUsers] = useState<EnhancedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [planFilter, setPlanFilter] = useState('all');
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [overrideUser, setOverrideUser] = useState<EnhancedUser | null>(null);
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [tierCounts, setTierCounts] = useState<TierCounts>({ free: 0, pro: 0, total: 0 });
  const [tierLoading, setTierLoading] = useState(true);

  // Sync header plan filter
  useEffect(() => {
    if (headerPlanFilter && headerPlanFilter !== 'all') {
      setPlanFilter(headerPlanFilter);
    }
  }, [headerPlanFilter]);

  // Fetch real tier counts from all users
  useEffect(() => {
    async function fetchTierCounts() {
      setTierLoading(true);
      try {
        const [totalRes, subsRes] = await Promise.all([
          supabase.rpc('admin_get_nevorai_user_count'),
          supabase.from('user_subscriptions').select('plan, tier, expires_at'),
        ]);
        const total = Number(totalRes.data) || 0;
        let proCount = 0;
        (subsRes.data || []).forEach((s: any) => {
          if (s.plan === 'pro') {
            const isActive = !s.expires_at || new Date(s.expires_at) > new Date();
            if (isActive) proCount++;
          }
        });
        setTierCounts({ free: total - proCount, pro: proCount, total });
      } catch { /* ignore */ }
      setTierLoading(false);
    }
    fetchTierCounts();
  }, []);

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('desc'); }
  };

  useEffect(() => {
    setPage(0);
  }, [searchQuery, planFilter]);

  const sortedUsers = useMemo(() => {
    const filtered = users.filter((u) => {
      if (planFilter === 'all') return true;
      if (planFilter === 'active_pro') return u.plan === 'pro' && !isExpiredPro(u) && !u.is_suspended;
      if (planFilter === 'expired_pro') return isExpiredPro(u);
      if (planFilter === 'suspended') return u.is_suspended;
      if (planFilter === 'trial') {
        const trialStart = u.trial_start_date || u.created_at;
        if (!trialStart || u.plan === 'pro') return false;
        const daysSince = Math.floor((Date.now() - new Date(trialStart).getTime()) / (1000 * 60 * 60 * 24));
        return daysSince < TRIAL_DURATION_DAYS;
      }
      if (planFilter === 'free') return u.plan !== 'pro';
      return true;
    });
    return [...filtered].sort((a, b) => {
      let cmp = 0;
      if (sortField === 'display_name') cmp = (a.display_name || '').localeCompare(b.display_name || '');
      else if (sortField === 'total_leads_count') cmp = a.total_leads_count - b.total_leads_count;
      else if (sortField === 'created_at') cmp = new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
      else if (sortField === 'expires_at') cmp = new Date(a.expires_at || 0).getTime() - new Date(b.expires_at || 0).getTime();
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [users, sortField, sortDir, planFilter]);

  const fetchUsers = useCallback(async () => {
    if (users.length === 0 && page === 0) setLoading(true);
    else setSearching(true);

    // Map composite UI filters back to the plan column the RPC understands
    const planForRpc =
      planFilter === 'active_pro' || planFilter === 'expired_pro'
        ? 'pro'
        : planFilter === 'free'
          ? 'free'
          : null; // all / trial / suspended → fetch unfiltered, refine client-side

    try {
      const { data, error } = await supabase.rpc('admin_search_users_enhanced' as any, {
        search_query: searchQuery,
        plan_filter: planForRpc,
        page_size: pageSize,
        page_offset: page * pageSize,
      });

      if (error) throw error;

      const mappedUsers: EnhancedUser[] = (data || []).map((row: any) => ({
        user_id: row.user_id,
        email: row.email,
        display_name: row.display_name,
        neverai_id: row.neverai_id,
        plan: row.plan || 'free',
        tier: row.tier || 'basic',
        is_admin_override: row.is_admin_override || false,
        subscribed_at: row.subscribed_at,
        expires_at: row.expires_at,
        total_leads_count: row.total_leads_count || 0,
        source_app: row.source_app,
        last_active_at: row.last_active_at,
        is_suspended: row.is_suspended || false,
        created_at: row.created_at,
        trial_start_date: row.trial_start_date || row.created_at,
      }));

      setUsers(mappedUsers);
      setTotalCount(data?.[0]?.total_count || 0);
    } catch (err) {
      console.error('Failed to fetch users:', err);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
      setSearching(false);
    }
  }, [searchQuery, planFilter, page, pageSize, users.length]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleSuspendToggle = async (user: EnhancedUser) => {
    const newStatus = !user.is_suspended;
    try {
      const { error } = await supabase.rpc('admin_toggle_user_suspension', { p_user_id: user.user_id, p_suspend: newStatus });
      if (error) throw error;
      setUsers(prev => prev.map(u => u.user_id === user.user_id ? { ...u, is_suspended: newStatus } : u));
      toast.success(newStatus ? 'User suspended' : 'User unsuspended');
    } catch (err) {
      console.error('Failed to toggle suspension:', err);
      toast.error('Failed to update user status');
    }
  };

  const handleGrantPlan = async (user: EnhancedUser, tier: string, durationDays: number) => {
    const tierDisplayName = getTierDisplayName(tier as InternalTier);
    try {
      const { error } = await supabase.functions.invoke('admin-update-subscription', {
        body: { user_id: user.user_id, plan: 'pro', tier, duration_days: durationDays },
      });
      if (error) throw error;
      await logAdminAction('user_plan_granted', 'user', user.user_id, { plan: user.plan, tier: user.tier }, { plan: 'pro', tier, duration_days: durationDays }, `Granted ${tierDisplayName} access to ${user.email || user.user_id} for ${durationDays} days`);
      await fetchUsers();
      queryClient.invalidateQueries({ queryKey: ['admin-analytics'] });
      toast.success(`${tierDisplayName} access granted`);
    } catch (err) {
      console.error('Failed to grant plan:', err);
      toast.error(`Failed to grant ${tierDisplayName} access`);
    }
  };

  const handleRevokePlan = async (user: EnhancedUser) => {
    const currentTierName = getTierDisplayName(user.tier as InternalTier);
    try {
      const { error } = await supabase.functions.invoke('admin-update-subscription', {
        body: { user_id: user.user_id, plan: 'free', tier: 'basic' },
      });
      if (error) throw error;
      await logAdminAction('user_plan_revoked', 'user', user.user_id, { plan: user.plan, tier: user.tier }, { plan: 'free', tier: 'basic' }, `Revoked ${currentTierName} access from ${user.email || user.user_id}`);
      await fetchUsers();
      queryClient.invalidateQueries({ queryKey: ['admin-analytics'] });
      toast.success(`${currentTierName} access revoked`);
    } catch (err) {
      console.error('Failed to revoke plan:', err);
      toast.error('Failed to revoke access');
    }
  };

  const copyEmail = (email: string | null) => {
    if (email) { navigator.clipboard.writeText(email); toast.success('Email copied'); }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <TierChips counts={tierCounts} loading={tierLoading} />

      {/* Search */}
      <div className="flex gap-2">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search email, name, ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-9 text-sm"
          />
        </div>
      </div>

      {/* Filter pills — Active Pro vs Expired Pro split */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
        {PLAN_FILTER_OPTIONS.map((opt) => {
          const active = planFilter === opt.value;
          return (
            <button
              key={opt.value}
              onClick={() => setPlanFilter(opt.value)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-[11px] font-medium border transition-colors whitespace-nowrap ${
                active
                  ? 'bg-primary/15 text-primary border-primary/30'
                  : 'bg-muted/40 text-muted-foreground border-border/50 hover:bg-muted/70'
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground">
        {searching && <Loader2 className="h-3 w-3 animate-spin inline mr-1" />}
        {totalCount === 0 ? 0 : page * pageSize + 1}–{Math.min((page + 1) * pageSize, totalCount).toLocaleString()} of {totalCount.toLocaleString()} users
      </p>

      {/* Users Table */}
      <div className="rounded-lg border border-border/50 bg-card">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-[11px] w-10">#</TableHead>
              <SortableHeader label="User" field="display_name" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
              <TableHead className="text-[11px]">Plan</TableHead>
              <TableHead className="text-[11px]">Status</TableHead>
              <TableHead className="text-[11px] hidden sm:table-cell">Expiry</TableHead>
              <SortableHeader label="Leads" field="total_leads_count" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
              <SortableHeader label="Joined" field="created_at" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
              <TableHead className="text-[11px] w-10">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedUsers.map((user, index) => {
              const daysLeft = user.expires_at ? differenceInDays(new Date(user.expires_at), new Date()) : null;

              return (
                <TableRow key={user.user_id} className={user.is_suspended ? 'opacity-50' : ''}>
                  {/* Row Number */}
                  <TableCell className="py-2 px-3 text-[11px] text-muted-foreground tabular-nums">
                    {page * pageSize + index + 1}
                  </TableCell>

                  {/* User */}
                  <TableCell className="py-2 px-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="text-sm font-medium truncate max-w-[140px]">{user.display_name || 'Unnamed'}</span>
                        {user.is_admin_override && <Badge variant="outline" className="text-[9px] text-yellow-600 px-1 py-0 leading-tight">OVR</Badge>}
                      </div>
                      <button onClick={() => copyEmail(user.email)} className="flex items-center gap-0.5 text-[11px] text-muted-foreground hover:text-primary transition-colors truncate max-w-[160px]">
                        <span className="truncate">{user.email || '—'}</span>
                        <Copy className="h-2.5 w-2.5 shrink-0 opacity-40" />
                      </button>
                    </div>
                  </TableCell>

                  {/* Plan */}
                  <TableCell className="py-2 px-3">
                    <TierBadge user={user} />
                  </TableCell>

                  {/* Status */}
                  <TableCell className="py-2 px-3">
                    <StatusBadge user={user} />
                  </TableCell>

                  {/* Expiry */}
                  <TableCell className="py-2 px-3 hidden sm:table-cell">
                    {user.expires_at ? (
                      <div className="text-[11px]">
                        <span>{format(new Date(user.expires_at), 'MMM d, yy')}</span>
                        {daysLeft !== null && (
                          <span className={`block text-[10px] ${daysLeft < 0 ? 'text-destructive' : daysLeft < 7 ? 'text-yellow-600' : 'text-muted-foreground'}`}>
                            {daysLeft < 0 ? `${Math.abs(daysLeft)}d ago` : `${daysLeft}d left`}
                          </span>
                        )}
                      </div>
                    ) : <span className="text-[11px] text-muted-foreground">—</span>}
                  </TableCell>

                  {/* Leads */}
                  <TableCell className="py-2 px-3 text-sm tabular-nums">
                    {user.total_leads_count}
                  </TableCell>

                  {/* Joined */}
                  <TableCell className="py-2 px-3 text-[11px] text-muted-foreground">
                    {user.created_at ? format(new Date(user.created_at), 'MMM d, yy') : '—'}
                  </TableCell>

                  {/* Actions */}
                  <TableCell className="py-2 px-1">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuSub>
                          <DropdownMenuSubTrigger className="text-xs">
                            <Crown className="h-3 w-3 mr-2" />
                            Grant Plan
                          </DropdownMenuSubTrigger>
                          <DropdownMenuSubContent>
                            <DropdownMenuItem disabled className="text-[11px] font-semibold">⭐ Pro</DropdownMenuItem>
                            {GRANT_OPTIONS.filter(o => o.tier === 'pro').map(o => (
                              <DropdownMenuItem key={o.value} className="text-xs pl-5" onClick={() => handleGrantPlan(user, o.tier, o.days)}>
                                {o.days >= 365 ? '1 year' : `${o.days} days`}
                              </DropdownMenuItem>
                            ))}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem disabled className="text-[11px] font-semibold">💎 Pro</DropdownMenuItem>
                            {GRANT_OPTIONS.filter(o => o.tier === 'premium').map(o => (
                              <DropdownMenuItem key={o.value} className="text-xs pl-5" onClick={() => handleGrantPlan(user, o.tier, o.days)}>
                                {o.days >= 365 ? '1 year' : `${o.days} days`}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuSubContent>
                        </DropdownMenuSub>

                        <DropdownMenuItem className="text-xs" onClick={() => setOverrideUser(user)}>
                          <Settings className="h-3 w-3 mr-2" />
                          Override Settings
                        </DropdownMenuItem>

                        {user.plan === 'pro' && (
                          <DropdownMenuItem className="text-xs text-destructive" onClick={() => handleRevokePlan(user)}>
                            Revoke Access
                          </DropdownMenuItem>
                        )}

                        <DropdownMenuSeparator />

                        <DropdownMenuItem className="text-xs" onClick={() => handleSuspendToggle(user)}>
                          {user.is_suspended ? 'Unsuspend User' : 'Suspend User'}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
            {users.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground text-sm">
                  No users found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {totalCount > pageSize && (
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] text-muted-foreground">
            Page {page + 1} of {Math.max(1, Math.ceil(totalCount / pageSize))}
          </p>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-2"
              onClick={() => setPage((current) => Math.max(0, current - 1))}
              disabled={page === 0 || searching}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-2"
              onClick={() => setPage((current) => current + 1)}
              disabled={page >= Math.ceil(totalCount / pageSize) - 1 || searching}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {overrideUser && (
        <UserOverrideDrawer
          open={!!overrideUser}
          onClose={() => setOverrideUser(null)}
          userId={overrideUser.user_id}
          userEmail={overrideUser.email || 'Unknown'}
          userName={overrideUser.display_name || undefined}
        />
      )}
    </div>
  );
}
