import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Loader2, Search, Crown, User, Settings, Ban, TrendingUp, Clock, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow, format } from 'date-fns';
import { UserOverrideDrawer } from './UserOverrideDrawer';
import { logAdminAction } from '@/hooks/useAuditLogs';

interface EnhancedUser {
  user_id: string;
  email: string | null;
  display_name: string | null;
  neverai_id: string | null;
  plan: string;
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

const TRIAL_DURATION_DAYS = 7; // Default trial duration

const PLAN_FILTER_OPTIONS = [
  { value: 'all', label: 'All Plans' },
  { value: 'free', label: 'Free' },
  { value: 'pro', label: 'Pro' },
];

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
      const { data, error } = await supabase.rpc('admin_search_users_enhanced', {
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
      const { error } = await supabase.rpc('admin_toggle_user_suspension', {
        p_user_id: user.user_id,
        p_suspend: newStatus,
      });

      if (error) throw error;

      // Update local state
      setUsers(prev => prev.map(u => 
        u.user_id === user.user_id ? { ...u, is_suspended: newStatus } : u
      ));

      toast.success(newStatus ? 'User suspended' : 'User unsuspended');
    } catch (err) {
      console.error('Failed to toggle suspension:', err);
      toast.error('Failed to update user status');
    }
  };

  const handleGrantPro = async (user: EnhancedUser, durationDays: number) => {
    try {
      const { error } = await supabase.functions.invoke('admin-update-subscription', {
        body: {
          user_id: user.user_id,
          plan: 'pro',
          duration_days: durationDays,
        },
      });

      if (error) throw error;

      // Log the action
      await logAdminAction(
        'user_pro_granted',
        'user',
        user.user_id,
        { plan: user.plan },
        { plan: 'pro', duration_days: durationDays },
        `Granted Pro access to ${user.email || user.user_id} for ${durationDays} days`
      );

      await fetchUsers();
      queryClient.invalidateQueries({ queryKey: ['admin-analytics'] });
      toast.success('Pro access granted');
    } catch (err) {
      console.error('Failed to grant Pro:', err);
      toast.error('Failed to grant Pro access');
    }
  };

  const handleRevokePro = async (user: EnhancedUser) => {
    try {
      const { error } = await supabase.functions.invoke('admin-update-subscription', {
        body: {
          user_id: user.user_id,
          plan: 'free',
        },
      });

      if (error) throw error;

      // Log the action
      await logAdminAction(
        'user_pro_revoked',
        'user',
        user.user_id,
        { plan: user.plan },
        { plan: 'free' },
        `Revoked Pro access from ${user.email || user.user_id}`
      );

      await fetchUsers();
      queryClient.invalidateQueries({ queryKey: ['admin-analytics'] });
      toast.success('Pro access revoked');
    } catch (err) {
      console.error('Failed to revoke Pro:', err);
      toast.error('Failed to revoke Pro access');
    }
  };

  const getSourceBadge = (source: string | null) => {
    if (!source) return <Badge variant="outline" className="text-xs">Direct</Badge>;
    if (source.toLowerCase().includes('achievers')) {
      return <Badge className="text-xs bg-purple-500">Achievers Club</Badge>;
    }
    return <Badge variant="outline" className="text-xs">{source}</Badge>;
  };

  const getTrialStatusBadge = (user: EnhancedUser) => {
    if (user.plan === 'pro' || user.plan === 'mini') return null;
    
    const trialStart = user.trial_start_date || user.created_at;
    if (!trialStart) return null;
    
    const startDate = new Date(trialStart);
    const now = new Date();
    const daysSinceStart = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const daysRemaining = TRIAL_DURATION_DAYS - daysSinceStart;
    
    if (daysRemaining <= 0) {
      return <Badge variant="outline" className="text-xs text-destructive border-destructive/50">Trial Expired</Badge>;
    }
    
    if (daysRemaining === 1) {
      return <Badge className="text-xs bg-yellow-500 text-yellow-950">Day 7 - Expiring!</Badge>;
    }
    
    const currentDay = daysSinceStart + 1;
    return (
      <Badge variant="outline" className="text-xs text-primary border-primary/50">
        Day {currentDay} of Trial
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by email, name, or upline..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={planFilter} onValueChange={setPlanFilter}>
          <SelectTrigger className="w-[120px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PLAN_FILTER_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Stats */}
      <p className="text-sm text-muted-foreground">
        {searching && <Loader2 className="h-3 w-3 animate-spin inline mr-1" />}
        Showing {users.length} of {totalCount} users
      </p>

      {/* Users List */}
      <div className="space-y-3">
        {users.map((user) => (
          <Card key={user.user_id} className={user.is_suspended ? 'opacity-60 border-destructive/50' : ''}>
            <CardContent className="p-4">
              {/* Header */}
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium truncate">{user.email || 'No email'}</span>
                    {user.plan === 'pro' ? (
                      <Badge className="bg-primary text-xs flex items-center gap-1">
                        <Crown className="h-3 w-3" />
                        Pro
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs">Free</Badge>
                    )}
                    {user.is_admin_override && (
                      <Badge variant="outline" className="text-xs text-yellow-600">Override</Badge>
                    )}
                    {user.is_suspended && (
                      <Badge variant="destructive" className="text-xs">Suspended</Badge>
                    )}
                    {getTrialStatusBadge(user)}
                  </div>
                  <p className="text-sm text-muted-foreground truncate">
                    {user.display_name || 'Unnamed'} {user.neverai_id && `• ${user.neverai_id}`}
                  </p>
                </div>
              </div>

              {/* Stats Row */}
              <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mb-3">
                <span className="flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  {user.total_leads_count} leads
                </span>
                {getSourceBadge(user.source_app)}
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {user.last_active_at 
                    ? formatDistanceToNow(new Date(user.last_active_at), { addSuffix: true })
                    : 'Never'}
                </span>
                {user.expires_at && (
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Expires {format(new Date(user.expires_at), 'MMM d')}
                  </span>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 flex-wrap">
                {user.plan === 'free' ? (
                  <Select onValueChange={(days) => handleGrantPro(user, parseInt(days))}>
                    <SelectTrigger className="w-[140px] h-8 text-xs">
                      <SelectValue placeholder="Grant Pro..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30">30 days</SelectItem>
                      <SelectItem value="90">90 days</SelectItem>
                      <SelectItem value="120">120 days</SelectItem>
                      <SelectItem value="365">1 year</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-8 text-xs"
                    onClick={() => handleRevokePro(user)}
                  >
                    Revoke Pro
                  </Button>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => setOverrideUser(user)}
                >
                  <Settings className="h-3 w-3 mr-1" />
                  Override
                </Button>

                <div className="flex items-center gap-2 ml-auto">
                  <span className="text-xs text-muted-foreground">
                    {user.is_suspended ? 'Suspended' : 'Active'}
                  </span>
                  <Switch
                    checked={user.is_suspended}
                    onCheckedChange={() => handleSuspendToggle(user)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {users.length === 0 && (
          <p className="text-center py-8 text-muted-foreground">
            No users found
          </p>
        )}
      </div>

      {/* Override Drawer */}
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
