import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useAdmin } from '@/hooks/useAdmin';
import { BottomNav } from '@/components/layout/BottomNav';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Shield, Users, Crown, ArrowLeft, Search, Save, Calendar, BarChart3, ChevronDown, MessageSquare } from 'lucide-react';
import { format, addDays } from 'date-fns';
import { toast } from 'sonner';
import nevoraLogo from '@/assets/nevorai-logo.jpeg';
import { AdminAnalyticsDashboard } from '@/components/admin/AdminAnalyticsDashboard';
import { AdminSupportPanel } from '@/components/admin/AdminSupportPanel';

const DURATION_OPTIONS = [
  { value: '30', label: '30 days' },
  { value: '60', label: '60 days' },
  { value: '90', label: '90 days' },
  { value: '365', label: '1 year' },
];

export default function Admin() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, users, loading, searching, fetchAllUsers, updateUserSubscription } = useAdmin();
  const [searchQuery, setSearchQuery] = useState('');
  const [userFilter, setUserFilter] = useState<'all' | 'free' | 'pro'>('all');
  const [pendingChanges, setPendingChanges] = useState<Record<string, { plan: 'free' | 'pro'; duration: string }>>({});
  const [savingUserId, setSavingUserId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  // Fetch users on mount and when search changes (debounced)
  useEffect(() => {
    if (isAdmin) {
      const timer = setTimeout(() => {
        fetchAllUsers(searchQuery);
      }, 300); // 300ms debounce for search
      return () => clearTimeout(timer);
    }
  }, [isAdmin, fetchAllUsers, searchQuery]);

  // Check if user's Pro is expired
  const isExpired = (expiresAt: string | null) => {
    if (!expiresAt) return true;
    return new Date(expiresAt) < new Date();
  };

  // Get effective status considering expiry
  const getEffectiveStatus = (u: typeof users[0]) => {
    if (u.plan !== 'pro') return 'free';
    if (!u.expires_at || isExpired(u.expires_at)) return 'expired';
    return 'pro';
  };

  // Handle plan change in dropdown
  const handlePlanChange = (userId: string, plan: 'free' | 'pro') => {
    setPendingChanges(prev => ({
      ...prev,
      [userId]: { plan, duration: prev[userId]?.duration || '30' }
    }));
  };

  // Handle duration change
  const handleDurationChange = (userId: string, duration: string) => {
    setPendingChanges(prev => ({
      ...prev,
      [userId]: { ...prev[userId], plan: 'pro', duration }
    }));
  };

  // Save changes for a user
  const handleSave = async (userId: string) => {
    const changes = pendingChanges[userId];
    if (!changes) return;

    setSavingUserId(userId);
    try {
      const durationDays = changes.plan === 'pro' ? parseInt(changes.duration) : undefined;
      const { error } = await updateUserSubscription(userId, changes.plan, durationDays);
      
      if (error) {
        toast.error('Failed to update subscription');
      } else {
        toast.success(`Subscription updated successfully`);
        // Clear pending changes for this user
        setPendingChanges(prev => {
          const { [userId]: _, ...rest } = prev;
          return rest;
        });
      }
    } catch (err) {
      toast.error('Error updating subscription');
    } finally {
      setSavingUserId(null);
    }
  };

  // Calculate expiry date for display
  const calculateExpiryDate = (duration: string) => {
    const days = parseInt(duration);
    return format(addDays(new Date(), days), 'dd MMM yyyy');
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
        <Shield className="h-16 w-16 text-destructive mb-4" />
        <h1 className="text-xl font-bold mb-2">Access Denied</h1>
        <p className="text-muted-foreground text-center mb-4">
          You don't have permission to access this page.
        </p>
        <Link to="/profile">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Profile
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="app-layout bg-gradient-to-b from-background via-background to-muted/20">
      <header className="fixed-header z-40 bg-card/80 backdrop-blur-xl border-b border-border/50 shrink-0">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <img 
              src={nevoraLogo} 
              alt="NevorAI Logo" 
              className="h-10 w-10 rounded-xl object-cover shadow-md"
            />
            <div>
              <h1 className="text-lg font-bold tracking-tight">Admin Panel</h1>
              <p className="text-[10px] text-muted-foreground font-medium">Manage user subscriptions</p>
            </div>
          </div>
          <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30">
            <Shield className="h-3 w-3 mr-1" />
            Admin
          </Badge>
        </div>
      </header>

      <main className="scrollable-content">
        <div className="container py-4 px-4 pb-24 space-y-5">
          {/* Admin Tabs */}
          <Tabs defaultValue="users" className="w-full">
            <TabsList className="w-full grid grid-cols-3">
              <TabsTrigger value="users" className="text-xs">
                <Users className="h-4 w-4 mr-1" />
                Users
              </TabsTrigger>
              <TabsTrigger value="analytics" className="text-xs">
                <BarChart3 className="h-4 w-4 mr-1" />
                Analytics
              </TabsTrigger>
              <TabsTrigger value="support" className="text-xs">
                <MessageSquare className="h-4 w-4 mr-1" />
                Support
              </TabsTrigger>
            </TabsList>

            {/* Analytics Tab */}
            <TabsContent value="analytics" className="mt-4">
              <AdminAnalyticsDashboard />
            </TabsContent>

            {/* Support Tab */}
            <TabsContent value="support" className="mt-4">
              <AdminSupportPanel />
            </TabsContent>

            {/* Users Tab */}
            <TabsContent value="users" className="mt-4 space-y-4">
          {/* Filters Row */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by email or name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-10"
              />
              {searching && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </div>
            <Select value={userFilter} onValueChange={(value) => setUserFilter(value as 'all' | 'free' | 'pro')}>
              <SelectTrigger className="w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Users</SelectItem>
                <SelectItem value="free">Free</SelectItem>
                <SelectItem value="pro">Pro</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* User List */}
          <div className="rounded-2xl bg-card border border-border/50 overflow-hidden flex flex-col">
            <div className="px-4 py-3 border-b border-border/50 bg-muted/30 shrink-0">
              <h3 className="font-semibold">
                {searchQuery || userFilter !== 'all' 
                  ? `Results (${users.filter(u => {
                      if (userFilter === 'all') return true;
                      const effectiveStatus = getEffectiveStatus(u);
                      if (userFilter === 'pro') return effectiveStatus === 'pro';
                      return effectiveStatus === 'free' || effectiveStatus === 'expired';
                    }).length})` 
                  : 'All Users'}
              </h3>
            </div>
            <div className="divide-y divide-border/50 overflow-y-auto max-h-[60vh]">
              {users.filter(u => {
                if (userFilter === 'all') return true;
                const effectiveStatus = getEffectiveStatus(u);
                if (userFilter === 'pro') return effectiveStatus === 'pro';
                return effectiveStatus === 'free' || effectiveStatus === 'expired';
              }).length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>{searchQuery || userFilter !== 'all' ? 'No users match your filters' : 'No users found'}</p>
                </div>
              ) : (
                users.filter(u => {
                  if (userFilter === 'all') return true;
                  const effectiveStatus = getEffectiveStatus(u);
                  if (userFilter === 'pro') return effectiveStatus === 'pro';
                  return effectiveStatus === 'free' || effectiveStatus === 'expired';
                }).map((u) => {
                  const effectiveStatus = getEffectiveStatus(u);
                  const pending = pendingChanges[u.id];
                  const currentPlan = pending?.plan ?? u.plan;
                  const currentDuration = pending?.duration ?? '30';
                  const hasChanges = !!pending;

                  return (
                    <div key={u.id} className="p-4 space-y-3">
                      {/* User Info Row */}
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{u.email}</p>
                          {u.name && (
                            <p className="text-xs text-muted-foreground truncate">{u.name}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant="outline" 
                            className={
                              effectiveStatus === 'pro' 
                                ? 'bg-amber-500/10 text-amber-600 border-amber-500/30'
                                : effectiveStatus === 'expired'
                                ? 'bg-red-500/10 text-red-600 border-red-500/30'
                                : 'bg-muted text-muted-foreground'
                            }
                          >
                            {effectiveStatus === 'pro' && <Crown className="h-3 w-3 mr-1" />}
                            {effectiveStatus === 'pro' ? 'Pro' : effectiveStatus === 'expired' ? 'Expired' : 'Free'}
                          </Badge>
                          {u.is_admin_override && effectiveStatus === 'pro' && (
                            <Badge variant="outline" className="bg-purple-500/10 text-purple-600 border-purple-500/30 text-[10px]">
                              Admin
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Plan & Expiry Controls */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Plan Select */}
                        <Select
                          value={currentPlan}
                          onValueChange={(value) => handlePlanChange(u.id, value as 'free' | 'pro')}
                        >
                          <SelectTrigger className="w-24 h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="free">Free</SelectItem>
                            <SelectItem value="pro">Pro</SelectItem>
                          </SelectContent>
                        </Select>

                        {/* Duration Select (only for Pro) */}
                        {currentPlan === 'pro' && (
                          <>
                            <Select
                              value={currentDuration}
                              onValueChange={(value) => handleDurationChange(u.id, value)}
                            >
                              <SelectTrigger className="w-28 h-8 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {DURATION_OPTIONS.map(opt => (
                                  <SelectItem key={opt.value} value={opt.value}>
                                    {opt.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>

                            {/* Expiry Date Preview */}
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Calendar className="h-3 w-3" />
                              <span>
                                {hasChanges 
                                  ? `→ ${calculateExpiryDate(currentDuration)}`
                                  : u.expires_at 
                                    ? format(new Date(u.expires_at), 'dd MMM yyyy')
                                    : 'No expiry'
                                }
                              </span>
                            </div>
                          </>
                        )}

                        {/* Save Button */}
                        {hasChanges && (
                          <Button
                            size="sm"
                            className="h-8 text-xs ml-auto"
                            onClick={() => handleSave(u.id)}
                            disabled={savingUserId === u.id}
                          >
                            {savingUserId === u.id ? (
                              <Loader2 className="h-3 w-3 animate-spin mr-1" />
                            ) : (
                              <Save className="h-3 w-3 mr-1" />
                            )}
                            Save
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          </TabsContent>
          </Tabs>

          <Link to="/profile">
            <Button variant="outline" className="w-full">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Profile
            </Button>
          </Link>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
