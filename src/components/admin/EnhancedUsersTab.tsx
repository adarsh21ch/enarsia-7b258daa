import { useState, useCallback, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Loader2, Search, Crown, Gem, Settings, TrendingUp, Clock, Calendar, Copy, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow, format } from 'date-fns';
import { UserOverrideDrawer } from './UserOverrideDrawer';
import { logAdminAction } from '@/hooks/useAuditLogs';
import { getTierDisplayName, type InternalTier } from '@/config/tierLabels';

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
  { value: 'all', label: 'All Plans' },
  { value: 'free', label: '🆓 Free' },
  { value: 'pro', label: '⭐ Basic' },
  { value: 'premium', label: '💎 Pro' },
];

const GRANT_OPTIONS = [
  { value: 'pro-30', label: 'Basic 30d', tier: 'pro', days: 30 },
  { value: 'pro-90', label: 'Basic 90d', tier: 'pro', days: 90 },
  { value: 'pro-120', label: 'Basic 120d', tier: 'pro', days: 120 },
  { value: 'pro-365', label: 'Basic 1yr', tier: 'pro', days: 365 },
  { value: 'premium-30', label: 'Pro 30d', tier: 'premium', days: 30 },
  { value: 'premium-90', label: 'Pro 90d', tier: 'premium', days: 90 },
  { value: 'premium-120', label: 'Pro 120d', tier: 'premium', days: 120 },
  { value: 'premium-365', label: 'Pro 1yr', tier: 'premium', days: 365 },
];

function TierChips({ users }: { users: EnhancedUser[] }) {
  const counts = useMemo(() => {
    const free = users.filter(u => u.plan !== 'pro').length;
    const basic = users.filter(u => u.plan === 'pro' && u.tier === 'pro').length;
    const pro = users.filter(u => u.plan === 'pro' && u.tier === 'premium').length;
    return { free, basic, pro };
  }, [users]);

  return (
    <div className="flex gap-2 flex-wrap">
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted/60 border border-border/50">
        <span className="text-xs text-muted-foreground">Free</span>
        <span className="text-sm font-bold">{counts.free}</span>
      </div>
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/30">
        <Crown className="h-3 w-3 text-primary" />
        <span className="text-xs text-primary">Basic</span>
        <span className="text-sm font-bold text-primary">{counts.basic}</span>
      </div>
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30">
        <Gem className="h-3 w-3 text-amber-600" />
        <span className="text-xs text-amber-600">Pro</span>
        <span className="text-sm font-bold text-amber-600">{counts.pro}</span>
      </div>
    </div>
  );
}

function UserCard({ 
  user, 
  onGrant, 
  onRevoke, 
  onOverride, 
  onSuspendToggle 
}: { 
  user: EnhancedUser;
  onGrant: (tier: string, days: number) => void;
  onRevoke: () => void;
  onOverride: () => void;
  onSuspendToggle: () => void;
}) {
  const tier = (user.tier || 'basic') as InternalTier;
  const isPaid = user.plan === 'pro';
  
  const borderColor = tier === 'premium' ? 'border-l-amber-500' : tier === 'pro' ? 'border-l-primary' : 'border-l-muted-foreground/30';

  const copyEmail = () => {
    if (user.email) {
      navigator.clipboard.writeText(user.email);
      toast.success('Email copied');
    }
  };

  const getTrialBadge = () => {
    if (isPaid) return null;
    const trialStart = user.trial_start_date || user.created_at;
    if (!trialStart) return null;
    const daysSince = Math.floor((Date.now() - new Date(trialStart).getTime()) / (1000 * 60 * 60 * 24));
    const remaining = TRIAL_DURATION_DAYS - daysSince;
    if (remaining <= 0) return <Badge variant="outline" className="text-[10px] text-destructive border-destructive/40 px-1.5 py-0">Expired</Badge>;
    return <Badge variant="outline" className="text-[10px] text-primary border-primary/40 px-1.5 py-0">Day {daysSince + 1}</Badge>;
  };

  const getTierBadge = () => {
    const displayName = getTierDisplayName(tier);
    if (tier === 'premium') return <Badge className="bg-amber-500/20 text-amber-700 dark:text-amber-400 text-[10px] px-1.5 py-0 gap-0.5"><Gem className="h-2.5 w-2.5" />{displayName}</Badge>;
    if (tier === 'pro') return <Badge className="bg-primary/20 text-primary text-[10px] px-1.5 py-0 gap-0.5"><Crown className="h-2.5 w-2.5" />{displayName}</Badge>;
    return <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{displayName}</Badge>;
  };

  return (
    <div className={`rounded-lg border bg-card border-l-4 ${borderColor} ${user.is_suspended ? 'opacity-50' : ''}`}>
      <div className="p-3 space-y-2">
        {/* Row 1: Email + Badges */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button onClick={copyEmail} className="flex items-center gap-1 text-sm font-medium truncate hover:text-primary transition-colors max-w-[200px]" title="Copy email">
            <span className="truncate">{user.email || 'No email'}</span>
            <Copy className="h-3 w-3 shrink-0 opacity-40" />
          </button>
          {getTierBadge()}
          {user.is_admin_override && <Badge variant="outline" className="text-[10px] text-yellow-600 px-1.5 py-0">Override</Badge>}
          {user.is_suspended && <Badge variant="destructive" className="text-[10px] px-1.5 py-0">Suspended</Badge>}
          {getTrialBadge()}
        </div>

        {/* Row 2: Name + ID */}
        <p className="text-xs text-muted-foreground truncate">
          {user.display_name || 'Unnamed'} {user.neverai_id && `• ${user.neverai_id}`}
        </p>

        {/* Row 3: Stats */}
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-0.5"><TrendingUp className="h-3 w-3" />{user.total_leads_count} leads</span>
          <span>{user.source_app || 'Direct'}</span>
          <span className="flex items-center gap-0.5">
            <Clock className="h-3 w-3" />
            {user.last_active_at ? formatDistanceToNow(new Date(user.last_active_at), { addSuffix: true }) : 'Never'}
          </span>
          {user.expires_at && <span className="flex items-center gap-0.5"><Calendar className="h-3 w-3" />Exp {format(new Date(user.expires_at), 'MMM d')}</span>}
        </div>

        {/* Row 4: Actions */}
        <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-border/30">
          <Select onValueChange={(val) => {
            const opt = GRANT_OPTIONS.find(o => o.value === val);
            if (opt) onGrant(opt.tier, opt.days);
          }}>
            <SelectTrigger className="w-[120px] h-7 text-[11px]">
              <SelectValue placeholder={isPaid ? 'Change...' : 'Grant...'} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__header_basic" disabled className="font-semibold text-[11px]">⭐ Basic</SelectItem>
              {GRANT_OPTIONS.filter(o => o.tier === 'pro').map(o => (
                <SelectItem key={o.value} value={o.value} className="text-[11px] pl-6">{o.days >= 365 ? '1 year' : `${o.days} days`}</SelectItem>
              ))}
              <SelectItem value="__header_pro" disabled className="font-semibold text-[11px]">💎 Pro</SelectItem>
              {GRANT_OPTIONS.filter(o => o.tier === 'premium').map(o => (
                <SelectItem key={o.value} value={o.value} className="text-[11px] pl-6">{o.days >= 365 ? '1 year' : `${o.days} days`}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {isPaid && (
            <Button variant="outline" size="sm" className="h-7 text-[11px] px-2" onClick={onRevoke}>Revoke</Button>
          )}

          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onOverride} title="Override settings">
            <Settings className="h-3.5 w-3.5" />
          </Button>

          <div className="flex items-center gap-1.5 ml-auto">
            <span className="text-[10px] text-muted-foreground">{user.is_suspended ? 'Off' : 'On'}</span>
            <Switch checked={user.is_suspended} onCheckedChange={onSuspendToggle} className="scale-75" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function EnhancedUsersTab() {
  const queryClient = useQueryClient();
  const [users, setUsers] = useState<EnhancedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [planFilter, setPlanFilter] = useState('all');
  const [totalCount, setTotalCount] = useState(0);
  const [overrideUser, setOverrideUser] = useState<EnhancedUser | null>(null);

  const fetchUsers = useCallback(async () => {
    if (users.length === 0) setLoading(true);
    else setSearching(true);

    try {
      const { data, error } = await supabase.rpc('admin_search_users_enhanced' as any, {
        search_query: searchQuery,
        plan_filter: planFilter === 'all' ? null : planFilter,
        page_size: 100,
        page_offset: 0,
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
      setTotalCount(data?.[0]?.total_count || mappedUsers.length);
    } catch (err) {
      console.error('Failed to fetch users:', err);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
      setSearching(false);
    }
  }, [searchQuery, planFilter]);

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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Tier Chips */}
      <TierChips users={users} />

      {/* Search and Filters */}
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
        <Select value={planFilter} onValueChange={setPlanFilter}>
          <SelectTrigger className="w-[120px] h-9 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PLAN_FILTER_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Count */}
      <p className="text-xs text-muted-foreground">
        {searching && <Loader2 className="h-3 w-3 animate-spin inline mr-1" />}
        {users.length} of {totalCount} users
      </p>

      {/* Users List */}
      <div className="space-y-2">
        {users.map((user) => (
          <UserCard
            key={user.user_id}
            user={user}
            onGrant={(tier, days) => handleGrantPlan(user, tier, days)}
            onRevoke={() => handleRevokePlan(user)}
            onOverride={() => setOverrideUser(user)}
            onSuspendToggle={() => handleSuspendToggle(user)}
          />
        ))}
        {users.length === 0 && (
          <p className="text-center py-8 text-muted-foreground text-sm">No users found</p>
        )}
      </div>

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
