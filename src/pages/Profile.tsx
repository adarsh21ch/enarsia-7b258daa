import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { useAdmin } from '@/hooks/useAdmin';
import { useSubscription } from '@/hooks/useSubscription';
import { useLeaderSetup } from '@/hooks/useLeaderSetup';
import { useTrackingFormatContext } from '@/contexts/TrackingFormatContext';
import { BottomNav } from '@/components/layout/BottomNav';
import { HeaderBellIcon } from '@/components/layout/HeaderBellIcon';
import { EditProfileDialog } from '@/components/profile/EditProfileDialog';
import { ShareProfileDialog } from '@/components/profile/ShareProfileDialog';
import { ChangePasswordDialog } from '@/components/profile/ChangePasswordDialog';
import { LeaderTrackingFormatDrawer } from '@/components/profile/LeaderTrackingFormatDrawer';
import { LevelManagement } from '@/components/profile/LevelManagement';
import { ProfileLevelDropdown } from '@/components/profile/ProfileLevelDropdown';

import { UpgradeCard } from '@/components/subscription/UpgradeCard';
import { PullToRefreshIndicator } from '@/components/PullToRefreshIndicator';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User, LogOut, ChevronRight, Phone, Building2, MapPin, Loader2, FileText, Shield, Receipt, Mail, Settings, Copy, ExternalLink, BarChart3 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { formatLeaderId } from '@/lib/leaderIdFormat';
import nevoraLogo from '@/assets/nevorai-logo.jpeg';

// Pull-to-refresh hook
function usePullToRefresh(onRefresh: () => Promise<void>, threshold = 80) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const startY = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (containerRef.current && containerRef.current.scrollTop === 0) {
      startY.current = e.touches[0].clientY;
    }
  }, []);
  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!startY.current || isRefreshing) return;
    const currentY = e.touches[0].clientY;
    const diff = currentY - startY.current;
    if (diff > 0 && containerRef.current && containerRef.current.scrollTop === 0) {
      setPullDistance(Math.min(diff * 0.5, threshold * 1.5));
    }
  }, [isRefreshing, threshold]);
  const handleTouchEnd = useCallback(async () => {
    if (pullDistance >= threshold && !isRefreshing) {
      setIsRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
      }
    }
    setPullDistance(0);
    startY.current = 0;
  }, [pullDistance, threshold, isRefreshing, onRefresh]);
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    container.addEventListener('touchstart', handleTouchStart, {
      passive: true
    });
    container.addEventListener('touchmove', handleTouchMove, {
      passive: true
    });
    container.addEventListener('touchend', handleTouchEnd);
    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);
  return {
    containerRef,
    isRefreshing,
    pullDistance,
    showIndicator: pullDistance > 20 || isRefreshing
  };
}
// Feature flag: Set to true to show upgrade UI in Profile tab
const SHOW_PROFILE_UPGRADE_UI = false;

export default function Profile() {
  const navigate = useNavigate();
  const {
    user,
    loading: authLoading,
    signOut
  } = useAuth();
  const {
    profile,
    loading: profileLoading,
    updating,
    updateProfile,
    updateLeaderHierarchy,
    clearLeaderHierarchy,
    refetch
  } = useProfile();
  const {
    isAdmin
  } = useAdmin();
  const {
    isPro,
    isAdminOverride,
    daysRemaining,
    subscription,
    loading: subLoading
  } = useSubscription();
  const {
    refreshFormat
  } = useTrackingFormatContext();
  const [editOpen, setEditOpen] = useState(false);

  // Handle TrackUp Dashboard - Open nevorai.com TrackUp
  const handleOpenTrackUp = () => {
    window.open('https://nevorai.com/auth?redirect=/trackup', '_blank');
  };

  // Process pending leader ID from share links
  useLeaderSetup();

  // Pull-to-refresh
  const handleRefresh = useCallback(async () => {
    await refetch?.();
    refreshFormat();
  }, [refetch, refreshFormat]);
  const {
    containerRef,
    isRefreshing,
    pullDistance,
    showIndicator
  } = usePullToRefresh(handleRefresh);
  useEffect(() => {
    if (!user && !authLoading) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);
  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };
  if (authLoading || profileLoading || subLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>;
  }
  if (!user) return null;
  const displayName = profile?.display_name || user.email?.split('@')[0] || 'User';
  const userInitials = displayName.slice(0, 2).toUpperCase();
  return <div className="app-layout bg-gradient-to-b from-background via-background to-muted/20">
      <header className="fixed-header z-40 bg-card/80 backdrop-blur-xl border-b border-border/50">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <img src={nevoraLogo} alt="NevorAI Logo" className="h-10 w-10 rounded-xl object-cover shadow-md" />
            <div>
              <h1 className="text-xl font-bold tracking-tight">Profile</h1>
              <p className="text-xs text-muted-foreground font-medium">Your Account & Settings</p>
            </div>
          </div>
          <HeaderBellIcon />
        </div>
      </header>

      <main ref={containerRef} className="scrollable-content relative">
        <PullToRefreshIndicator isRefreshing={isRefreshing} pullDistance={pullDistance} showIndicator={showIndicator} />
        <div className="container py-3 px-4 space-y-4 pb-20">
          {/* User Card */}
          <div className="relative overflow-hidden rounded-2xl p-5 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/10 shadow-lg">
            <div className="flex items-start gap-4">
              <Avatar className="h-16 w-16 ring-4 ring-primary/20 shrink-0">
                <AvatarImage src={profile?.avatar_url || undefined} alt={displayName} />
                <AvatarFallback className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground text-xl font-bold">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-lg truncate">{displayName}</p>
                    <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                  </div>
                  {/* Level dropdown in top-right */}
                  <ProfileLevelDropdown currentLevelId={profile?.level_id || null} leaderNeveraiId={profile?.root_leader_id || profile?.leaders_id_of_my_leader || null} userId={user.id} onLevelChange={() => refetch?.()} />
                </div>
                {(profile?.leader_id || profile?.neverai_id) && <div className="flex items-center gap-1.5 mt-2">
                    <p className="text-xs text-primary font-medium">
                      Your NevorAI ID: <span className="font-mono">{formatLeaderId(profile.leader_id || profile.neverai_id, profile.leader_code_seq)}</span>
                    </p>
                    <button onClick={async () => {
                  // Copy the formatted ID
                  const displayId = formatLeaderId(profile.leader_id || profile.neverai_id, profile.leader_code_seq);
                  await navigator.clipboard.writeText(displayId);
                  toast.success('NevorAI ID copied');
                }} className="p-1 rounded hover:bg-primary/10 transition-colors" title="Copy NevorAI ID">
                      <Copy className="h-3 w-3 text-primary" />
                    </button>
                  </div>}
              </div>
            </div>
            {/* Decorative elements */}
            <div className="absolute -right-8 -bottom-8 w-32 h-32 rounded-full bg-primary/5" />
            <div className="absolute -right-4 -top-4 w-16 h-16 rounded-full bg-primary/5" />
          </div>

          {/* Share Profile Button - Prominent */}
          <ShareProfileDialog />

          {/* Upgrade Card - Hidden via feature flag, can be re-enabled by setting SHOW_PROFILE_UPGRADE_UI = true */}
          {SHOW_PROFILE_UPGRADE_UI && <UpgradeCard />}

          {/* Leader & Tracking Format Settings - Opens in Sidebar */}
          <LeaderTrackingFormatDrawer
            profile={profile}
            updating={updating}
            onUpdateProfile={updateProfile}
            onUpdateLeaderHierarchy={updateLeaderHierarchy}
            onClearLeaderHierarchy={clearLeaderHierarchy}
          />


          {/* Profile Details */}
          {(profile?.phone || profile?.company_name || profile?.city || profile?.bio) && <div className="rounded-2xl p-4 bg-card border border-border/50 space-y-3">
              {profile?.phone && <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Phone className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Phone</p>
                    <p className="text-sm font-medium">{profile.phone}</p>
                  </div>
                </div>}
              {profile?.company_name && <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-violet-500/10">
                    <Building2 className="h-4 w-4 text-violet-500" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Company</p>
                    <p className="text-sm font-medium">{profile.company_name}</p>
                  </div>
                </div>}
              {profile?.city && <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-emerald-500/10">
                    <MapPin className="h-4 w-4 text-emerald-500" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Location</p>
                    <p className="text-sm font-medium">{profile.city}</p>
                  </div>
                </div>}
              {profile?.bio && <div className="pt-2 border-t border-border/50">
                  <p className="text-xs text-muted-foreground mb-1">Bio</p>
                  <p className="text-sm">{profile.bio}</p>
                </div>}
            </div>}

          {/* Menu Items */}
          <div className="space-y-2">
            {/* My Tracking / Track Up - Personal tracking page */}
            <button 
              onClick={() => navigate('/tracking')}
              className={cn(
                "w-full relative overflow-hidden rounded-xl p-4",
                "bg-gradient-to-r backdrop-blur-sm",
                "border border-border/50 shadow-sm",
                "flex items-center justify-between",
                "transition-all duration-300 hover:shadow-md hover:scale-[1.01]",
                "from-primary/20 to-primary/5"
              )}
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <BarChart3 className="h-5 w-5 text-primary" />
                </div>
                <div className="text-left">
                  <span className="font-medium block">My Tracking / Track Up</span>
                  <span className="text-xs text-muted-foreground">Personal leads & funnel analytics</span>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </button>

            {/* TrackUp Dashboard - Navigate to internal tracking */}
            <button 
              onClick={handleOpenTrackUp}
              className={cn(
                "w-full relative overflow-hidden rounded-xl p-4",
                "bg-gradient-to-r backdrop-blur-sm",
                "border border-border/50 shadow-sm",
                "flex items-center justify-between",
                "transition-all duration-300 hover:shadow-md hover:scale-[1.01]",
                "from-emerald-500/20 to-emerald-500/5"
              )}
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/10">
                  <BarChart3 className="h-5 w-5 text-emerald-500" />
                </div>
                <div className="text-left">
                  <span className="font-medium block">TrackUp Dashboard</span>
                  <span className="text-xs text-muted-foreground">Open TrackUp on nevorai.com</span>
                </div>
              </div>
              <ExternalLink className="h-5 w-5 text-muted-foreground" />
            </button>

            <button onClick={() => setEditOpen(true)} className={cn("w-full relative overflow-hidden rounded-xl p-4", "bg-gradient-to-r backdrop-blur-sm", "border border-border/50 shadow-sm", "flex items-center justify-between", "transition-all duration-300 hover:shadow-md hover:scale-[1.01]", "from-blue-500/20 to-blue-500/5")}>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-card/50">
                  <User className="h-5 w-5" />
                </div>
                <span className="font-medium">Edit Profile</span>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </button>

            {/* Change Password */}
            <ChangePasswordDialog />

            {/* Admin Panel Link - Only visible to admin */}
            {isAdmin && <Link to="/admin" className={cn("w-full relative overflow-hidden rounded-xl p-4", "bg-gradient-to-r backdrop-blur-sm", "border border-destructive/30 shadow-sm", "flex items-center justify-between", "transition-all duration-300 hover:shadow-md hover:scale-[1.01]", "from-destructive/20 to-destructive/5")}>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-destructive/10">
                    <Settings className="h-5 w-5 text-destructive" />
                  </div>
                  <span className="font-medium">Admin Panel</span>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </Link>}
          </div>

          {/* Contact Us */}
          <div className="rounded-2xl p-4 bg-card border border-border/50">
            <h3 className="text-sm font-semibold text-foreground mb-3">Contact Us</h3>
            <a href="mailto:teamnevorai@gmail.com" className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-primary" />
                <div>
                  <span className="text-sm">Email us at:</span>
                  <p className="text-sm font-medium text-primary">teamnevorai@gmail.com</p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </a>
          </div>

          {/* Legal & Policies */}
          <div className="rounded-2xl p-4 bg-card border border-border/50">
            <h3 className="text-sm font-semibold text-foreground mb-3">Legal & Policies</h3>
            <div className="space-y-2">
              <Link to="/terms" className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-3">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Terms & Conditions</span>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </Link>
              <Link to="/privacy" className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-3">
                  <Shield className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Privacy Policy</span>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </Link>
              <Link to="/refund" className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-3">
                  <Receipt className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Refund Policy</span>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </Link>
            </div>
          </div>

          {/* Sign Out */}
          <Button variant="destructive" className="w-full h-12 rounded-xl shadow-lg shadow-destructive/20 mt-4" onClick={handleSignOut}>
            <LogOut className="h-5 w-5 mr-2" />
            Sign Out
          </Button>
        </div>
      </main>

      <EditProfileDialog open={editOpen} onOpenChange={setEditOpen} profile={profile} onSave={updateProfile} updating={updating} />

      <BottomNav />
    </div>;
}