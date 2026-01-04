import { useEffect, useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useAdmin } from '@/hooks/useAdmin';
import { BottomNav } from '@/components/layout/BottomNav';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Shield, Users, Crown, ArrowLeft, Search, Save, Calendar } from 'lucide-react';
import { format, addDays, addYears } from 'date-fns';
import { toast } from 'sonner';
import nevoraLogo from '@/assets/nevorai-logo.jpeg';

const DURATION_OPTIONS = [
  { value: '30', label: '30 days' },
  { value: '60', label: '60 days' },
  { value: '90', label: '90 days' },
  { value: '365', label: '1 year' },
];

export default function Admin() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, users, loading, fetchAllUsers, updateUserSubscription } = useAdmin();
  const [searchQuery, setSearchQuery] = useState('');
  const [pendingChanges, setPendingChanges] = useState<Record<string, { plan: 'free' | 'pro'; duration: string }>>({});
  const [savingUserId, setSavingUserId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (isAdmin) {
      fetchAllUsers();
    }
  }, [isAdmin, fetchAllUsers]);

  // Filter users by search query (email or name)
  const filteredUsers = useMemo(() => {
    console.log('Recomputing filteredUsers, users count:', users.length);
    if (!searchQuery.trim()) return users;
    const query = searchQuery.toLowerCase();
    return users.filter(u => 
      u.email.toLowerCase().includes(query) ||
      (u.name && u.name.toLowerCase().includes(query))
    );
  }, [users, searchQuery]);

  // Debug: log when users change
  useEffect(() => {
    console.log('Users state updated:', users.map(u => ({ id: u.id, plan: u.plan, expires_at: u.expires_at })));
  }, [users]);

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
          {/* Stats */}
          <div className="grid grid-cols-2 gap-3 shrink-0">
            <div className="rounded-xl p-4 bg-card border border-border/50">
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-5 w-5 text-primary" />
                <span className="text-sm text-muted-foreground">Total Users</span>
              </div>
              <p className="text-2xl font-bold">{users.length}</p>
            </div>
            <div className="rounded-xl p-4 bg-card border border-border/50">
              <div className="flex items-center gap-2 mb-2">
                <Crown className="h-5 w-5 text-amber-500" />
                <span className="text-sm text-muted-foreground">Active Pro</span>
              </div>
              <p className="text-2xl font-bold">
                {users.filter(u => getEffectiveStatus(u) === 'pro').length}
              </p>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by email or name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* User List */}
          <div className="rounded-2xl bg-card border border-border/50 overflow-hidden flex flex-col">
            <div className="px-4 py-3 border-b border-border/50 bg-muted/30 shrink-0">
              <h3 className="font-semibold">
                {searchQuery ? `Results (${filteredUsers.length})` : 'All Users'}
              </h3>
            </div>
            <div className="divide-y divide-border/50 overflow-y-auto max-h-[60vh]">
              {filteredUsers.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>{searchQuery ? 'No users match your search' : 'No users found'}</p>
                </div>
              ) : (
                filteredUsers.map((u) => {
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
