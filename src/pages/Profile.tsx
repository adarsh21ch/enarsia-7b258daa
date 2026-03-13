import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { useAdmin } from '@/hooks/useAdmin';
import { usePermissions } from '@/contexts/PermissionsContext';
import { useLeaderSetup } from '@/hooks/useLeaderSetup';
import { useLifetimeLeadLimit } from '@/hooks/useLifetimeLeadLimit';
import { useTrackingFormatContext } from '@/contexts/TrackingFormatContext';
import { useFreeTrial } from '@/hooks/useFreeTrial';
import { BottomNav } from '@/components/layout/BottomNav';
import { HeaderBellIcon } from '@/components/layout/HeaderBellIcon';
import { EditProfileDialog } from '@/components/profile/EditProfileDialog';
import { ChangePasswordDialog } from '@/components/profile/ChangePasswordDialog';
import { LeaderTrackingFormatDrawer } from '@/components/profile/LeaderTrackingFormatDrawer';
import { ConnectUplineCard } from '@/components/profile/ConnectUplineCard';
import { ProfileLevelDropdown } from '@/components/profile/ProfileLevelDropdown';
import { HelpSupportDrawer } from '@/components/profile/HelpSupportDrawer';
import { UserGuideDrawer } from '@/components/profile/UserGuideDrawer';
import { RecentlyDeletedDrawer } from '@/components/profile/RecentlyDeletedDrawer';
import { ProgressiveNudgeBanner } from '@/components/subscription/ProgressiveNudgeBanner';
import { TrialBanner } from '@/components/subscription/TrialBanner';
import { UpgradeButton } from '@/components/subscription/UpgradeButton';
import { PullToRefreshIndicator } from '@/components/PullToRefreshIndicator';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { User, LogOut, ChevronRight, ChevronDown, Loader2, FileText, Shield, Receipt, Settings, ExternalLink, BarChart3, Crown, Gift, Trash2, Sparkles, Lock, Share2, Video, Sliders, NotebookPen } from 'lucide-react';

import { useSharedLeads } from '@/hooks/useSharedLeads';
import { AIAssistantChat } from '@/components/ai/AIAssistantChat';
import { useFeatureAccess } from '@/hooks/useFeatureAccess';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
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
// Removed - no longer used

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
    updateUplineByEmail,
    clearLeaderHierarchy,
    refetch
  } = useProfile();
  const {
    isAdmin
  } = useAdmin();
  const {
    isPaid: isPro,
    isLoading: subLoading
  } = usePermissions();
  const {
    refreshFormat
  } = useTrackingFormatContext();
  const {
    isPaid
  } = useLifetimeLeadLimit();
  const {
    isTrialActive,
    daysRemaining: trialDaysRemaining,
    hoursRemaining
  } = useFreeTrial();
  const [editOpen, setEditOpen] = useState(false);
  const [showAIChat, setShowAIChat] = useState(false);
  
  const { canAccess: canAccessAI } = useFeatureAccess('ai_assistant');
  const { pendingCount } = useSharedLeads();

  // Handle SSO redirect to nevorai.com pages
  const handleSSORedirect = useCallback(async (targetUrl: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        window.open(targetUrl, '_blank', 'noopener,noreferrer');
        return;
      }
      const response = await supabase.functions.invoke('trackup-sso-link', {
        body: { redirectTo: targetUrl },
      });
      const link = response.data?.action_link;
      if (link) {
        window.open(link, '_blank', 'noopener,noreferrer');
      } else {
        window.open(targetUrl, '_blank', 'noopener,noreferrer');
      }
    } catch {
      window.open(targetUrl, '_blank', 'noopener,noreferrer');
    }
  }, []);

  // Process pending upline email from share links
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
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-lg truncate">{displayName}</p>
                      {isPro && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                          <Crown className="h-3 w-3" />
                          Pro
                        </span>}
                      {isTrialActive && !isPro && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                          <Gift className="h-3 w-3" />
                          {trialDaysRemaining > 0 ? `${trialDaysRemaining}d Trial` : `${hoursRemaining}h Trial`}
                        </span>}
                    </div>
                    <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                  </div>
                  {/* Level dropdown in top-right */}
                  <ProfileLevelDropdown currentLevelId={profile?.level_id || null} uplineEmail={profile?.upline_email || null} userId={user.id} onLevelChange={() => refetch?.()} />
                </div>
                {/* Show connected upline - display name or email prefix, never full email */}
                {profile?.upline_email && <p className="text-xs text-muted-foreground mt-2">
                    Connected to: <span className="text-primary font-medium">
                      {profile.upline_email.split('@')[0].charAt(0).toUpperCase() + profile.upline_email.split('@')[0].slice(1)}
                    </span>
                  </p>}
              </div>
            </div>
            {/* Decorative elements */}
            <div className="absolute -right-8 -bottom-8 w-32 h-32 rounded-full bg-primary/5" />
            <div className="absolute -right-4 -top-4 w-16 h-16 rounded-full bg-primary/5" />
          </div>

          {/* Trial Banner - show for users with active trial */}
          <TrialBanner tabId="profile" />
          
          {/* Upgrade Button - prominent golden card for non-Pro users */}
          {!isPro && !isTrialActive && (
            <UpgradeButton className="w-full" variant="prominent" />
          )}
          
          {/* Progressive Upgrade Nudge Banner - non-spammy, stage-based */}
          {!isPaid && <ProgressiveNudgeBanner context="profile" />}

          {/* Connect to Upline - Collapsible card */}
          <ConnectUplineCard profile={profile} updating={updating} onUpdateProfile={updateProfile} onUpdateUplineByEmail={updateUplineByEmail} onClearLeaderHierarchy={clearLeaderHierarchy} />


          {/* Bio only - phone/company/location hidden for cleaner UI */}
          {profile?.bio && (
            <div className="rounded-2xl p-4 bg-card border border-border/50">
              <p className="text-xs text-muted-foreground mb-1">Bio</p>
              <p className="text-sm">{profile.bio}</p>
            </div>
          )}

          {/* TrackUp Dashboard - External link with SSO */}
          <button onClick={() => handleSSORedirect('https://nevorai.com/trackup')} className={cn("w-full rounded-xl px-4 py-2.5", "bg-gradient-to-r backdrop-blur-sm", "border border-emerald-500/30", "flex items-center justify-between", "transition-all duration-200 hover:shadow-md", "from-emerald-500/20 to-emerald-500/5")}>
            <div className="flex items-center gap-3">
              <div className="p-1.5 rounded-lg bg-emerald-500/10">
                <BarChart3 className="h-4 w-4 text-emerald-500" />
              </div>
              <div className="text-left">
                <span className="font-medium text-sm block">TrackUp Dashboard</span>
                <span className="text-[11px] text-muted-foreground">Team tracking on nevorai.com</span>
              </div>
            </div>
            <ExternalLink className="h-4 w-4 text-muted-foreground" />
          </button>

          {/* Nevorai Funnels - External link with SSO */}
          <button onClick={() => handleSSORedirect('https://nevorai.com/funnels')} className={cn("w-full rounded-xl px-4 py-2.5", "bg-gradient-to-r backdrop-blur-sm", "border border-purple-500/30", "flex items-center justify-between", "transition-all duration-200 hover:shadow-md", "from-purple-500/20 to-purple-500/5")}>
            <div className="flex items-center gap-3">
              <div className="p-1.5 rounded-lg bg-purple-500/10">
                <Video className="h-4 w-4 text-purple-500" />
              </div>
              <div className="text-left">
                <span className="font-medium text-sm block">Nevorai Funnels</span>
                <span className="text-[11px] text-muted-foreground">Video funnels on nevorai.com</span>
              </div>
            </div>
            <ExternalLink className="h-4 w-4 text-muted-foreground" />
          </button>

          {/* Nevorai Forms */}
          <button onClick={() => navigate('/forms')} className={cn("w-full rounded-xl px-4 py-2.5", "bg-gradient-to-r backdrop-blur-sm", "border border-blue-500/30", "flex items-center justify-between", "transition-all duration-200 hover:shadow-md", "from-blue-500/20 to-blue-500/5")}>
            <div className="flex items-center gap-3">
              <div className="p-1.5 rounded-lg bg-blue-500/10">
                <FileText className="h-4 w-4 text-blue-500" />
              </div>
              <div className="text-left">
                <span className="font-medium text-sm block">Nevorai Forms</span>
                <span className="text-[11px] text-muted-foreground">Create & manage forms</span>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>

          {/* Nevorai Notes */}
          <button onClick={() => navigate('/notes')} className={cn("w-full rounded-xl px-4 py-2.5", "bg-gradient-to-r backdrop-blur-sm", "border border-accent/30", "flex items-center justify-between", "transition-all duration-200 hover:shadow-md", "from-accent/15 to-accent/5")}>
            <div className="flex items-center gap-3">
              <div className="p-1.5 rounded-lg bg-accent/10">
                <NotebookPen className="h-4 w-4 text-accent" />
              </div>
              <div className="text-left">
                <span className="font-medium text-sm block">Nevorai Notes</span>
                <span className="text-[11px] text-muted-foreground">Quick notes, voice memos & more</span>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>
          <button onClick={() => navigate('/shared-leads')} className={cn(
            "w-full rounded-xl px-4 py-2.5",
            "bg-gradient-to-r backdrop-blur-sm",
            "border border-orange-500/30",
            "flex items-center justify-between",
            "transition-all duration-200 hover:shadow-md",
            "from-orange-500/20 to-orange-500/5"
          )}>
            <div className="flex items-center gap-3">
              <div className="p-1.5 rounded-lg bg-orange-500/10">
                <Share2 className="h-4 w-4 text-orange-500" />
              </div>
              <div className="text-left">
                <span className="font-medium text-sm block">Shared Leads</span>
                <span className="text-[11px] text-muted-foreground">View & import leads from your team</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {pendingCount > 0 && (
                <span className="inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full text-[10px] font-bold bg-orange-500 text-white">
                  {pendingCount}
                </span>
              )}
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>
          </button>
          <button onClick={() => {
            if (canAccessAI) {
              setShowAIChat(true);
            } else {
              toast('Upgrade your plan to unlock AI Assistant', { icon: '🔒' });
            }
          }} className={cn(
            "w-full rounded-xl px-4 py-2.5",
            "bg-gradient-to-r backdrop-blur-sm",
            "border",
            "flex items-center justify-between",
            "transition-all duration-200 hover:shadow-md",
            canAccessAI
              ? "from-primary/20 to-primary/5 border-primary/30"
              : "from-muted/40 to-muted/20 border-border/50 opacity-80"
          )}>
            <div className="flex items-center gap-3">
              <div className={cn("p-1.5 rounded-lg", canAccessAI ? "bg-primary/10" : "bg-muted")}>
                <Sparkles className={cn("h-4 w-4", canAccessAI ? "text-primary" : "text-muted-foreground")} />
              </div>
              <div className="text-left">
                <span className="font-medium text-sm block flex items-center gap-1.5">
                  Nevorai AI Assistant
                  {!canAccessAI && <Lock className="h-3 w-3 text-muted-foreground" />}
                </span>
                <span className="text-[11px] text-muted-foreground">
                  {canAccessAI ? "Smart help for follow-ups & strategy" : "Upgrade to unlock"}
                </span>
              </div>
            </div>
            {canAccessAI ? (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            ) : (
              <Crown className="h-4 w-4 text-amber-500" />
            )}
          </button>

          {/* Tracking Format - Opens drawer with full settings */}
          <LeaderTrackingFormatDrawer profile={profile} updating={updating} onUpdateProfile={updateProfile} onUpdateUplineByEmail={updateUplineByEmail} onClearLeaderHierarchy={clearLeaderHierarchy} />

          {/* Recently Deleted */}
          <RecentlyDeletedDrawer
          trigger={
          <button className="w-full rounded-xl px-4 py-2 bg-card border border-border/50 flex items-center justify-between transition-colors hover:bg-muted/50">
                <div className="flex items-center gap-2.5">
                  <Trash2 className="h-4 w-4 text-destructive" />
                  <span className="font-medium text-sm">Recently Deleted</span>
                </div>
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
          } />

          {/* User Guide */}
          <UserGuideDrawer />

          {/* Help & Support */}
          <HelpSupportDrawer />

          {/* Settings Section - Collapsible */}
          <Collapsible className="rounded-xl bg-card border border-border/50 overflow-hidden">
            <CollapsibleTrigger className="w-full px-4 py-2 flex items-center justify-between hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-2.5">
                <Settings className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium text-sm">Settings</span>
              </div>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground transition-transform [[data-state=open]>&]:rotate-180" />
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="px-4 pb-2 space-y-0.5">
                <button onClick={() => setEditOpen(true)} className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-2.5">
                    <User className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-sm">Edit Profile</span>
                  </div>
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
                <ChangePasswordDialog />
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Legal & Policies - Collapsible */}
          <Collapsible className="rounded-xl bg-card border border-border/50 overflow-hidden">
            <CollapsibleTrigger className="w-full px-4 py-2 flex items-center justify-between hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-2.5">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium text-sm">Legal & Policies</span>
              </div>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground transition-transform [[data-state=open]>&]:rotate-180" />
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="px-4 pb-2 space-y-0.5">
                <Link to="/terms" className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-2.5">
                    <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-sm">Terms & Conditions</span>
                  </div>
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                </Link>
                <Link to="/privacy" className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-2.5">
                    <Shield className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-sm">Privacy Policy</span>
                  </div>
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                </Link>
                <Link to="/refund" className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-2.5">
                    <Receipt className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-sm">Refund Policy</span>
                  </div>
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                </Link>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Admin Panel Link - Only visible to admin */}
          {isAdmin && <Link to="/admin" className="w-full rounded-xl px-4 py-2 block bg-card border border-destructive/30 flex items-center justify-between transition-colors hover:bg-muted/50">
              <div className="flex items-center gap-2.5">
                <Shield className="h-4 w-4 text-destructive" />
                <span className="font-medium text-sm">Admin Panel</span>
              </div>
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
            </Link>}

          {/* Sign Out */}
          <Button variant="destructive" className="w-full h-10 rounded-xl shadow-md shadow-destructive/20 mt-1" onClick={handleSignOut}>
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </main>

      <EditProfileDialog open={editOpen} onOpenChange={setEditOpen} profile={profile} onSave={updateProfile} updating={updating} />

      <AIAssistantChat open={showAIChat} onOpenChange={setShowAIChat} />

      

      <BottomNav />
    </div>;
}