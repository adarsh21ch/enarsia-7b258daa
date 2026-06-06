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
import { useSubscription } from '@/hooks/useSubscription';
import { BottomNav } from '@/components/layout/BottomNav';
import { HeaderBellIcon } from '@/components/layout/HeaderBellIcon';
import { EditProfileDialog } from '@/components/profile/EditProfileDialog';
import { ChangePasswordDialog } from '@/components/profile/ChangePasswordDialog';

import { ConnectUplineCard } from '@/components/profile/ConnectUplineCard';
import { ProfileLevelDropdown } from '@/components/profile/ProfileLevelDropdown';
import { HelpSupportDrawer } from '@/components/profile/HelpSupportDrawer';
import { UserGuideDrawer } from '@/components/profile/UserGuideDrawer';
import { useDeletionBatches } from '@/hooks/useDeletionBatches';
import { ProgressiveNudgeBanner } from '@/components/subscription/ProgressiveNudgeBanner';
import { TrialBanner } from '@/components/subscription/TrialBanner';
import { UpgradeButton } from '@/components/subscription/UpgradeButton';
import { SubscriptionStatusBanner } from '@/components/subscription/SubscriptionStatusBanner';
import { PullToRefreshIndicator } from '@/components/PullToRefreshIndicator';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { User, LogOut, ChevronRight, ChevronDown, Loader2, FileText, Shield, Receipt, Settings, ExternalLink, BarChart3, Crown, Gift, Trash2, Sparkles, Lock, Share2, Video, Sliders, NotebookPen, Bell, BrainCircuit, PlayCircle, Clock, Smartphone, GraduationCap, Pencil, Clapperboard } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { usePushNotifications } from '@/hooks/usePushNotifications';

import { useSharedLeads } from '@/hooks/useSharedLeads';
import { AIAssistantChat } from '@/components/ai/AIAssistantChat';
import { InstallInstructionsSheet } from '@/components/pwa/InstallPromptBanner';
import { AppNotificationsSheet } from '@/components/profile/AppNotificationsSheet';
import { ThemeSettings } from '@/components/profile/ThemeSettings';
import { useFeatureAccess } from '@/hooks/useFeatureAccess';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import nevoraLogo from '@/assets/nevorai-call-logo.png';

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
// Notification toggle component
function NotificationToggle({ canSendTest }: { canSendTest: boolean }) {
  const { isSupported, isSubscribed, loading, subscribe, unsubscribe, sendTestPush } = usePushNotifications();
  const [toggling, setToggling] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);

  if (!isSupported) return null;

  const handleToggle = async (checked: boolean) => {
    setToggling(true);

    if (checked) {
      const result = await subscribe();
      if (result.ok) {
        toast.success('Notifications enabled!');
      } else if (result.reason === 'permission_blocked') {
        toast.error('Notifications are blocked in browser settings for this site.');
      } else if (result.reason === 'permission_denied') {
        toast.error('Please allow notification permission to enable push alerts.');
      } else {
        toast.error('Could not enable notifications right now. Please try again.');
      }
    } else {
      await unsubscribe();
      toast.success('Notifications disabled');
    }

    setToggling(false);
  };

  const handleSendTest = async () => {
    setSendingTest(true);
    const result = await sendTestPush();

    if (result.ok && result.sent > 0) {
      toast.success('Test push sent to this device.');
    } else if (result.ok) {
      toast.error('No active subscription found on this device. Turn notifications ON first.');
    } else {
      toast.error('Failed to send test push. Try again in a moment.');
    }

    setSendingTest(false);
  };

  return (
    <div className="rounded-xl bg-card border border-border/50 px-4 py-2.5 space-y-2.5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Bell className="h-4 w-4 text-primary" />
          <div>
            <span className="font-medium text-sm block">App Notifications</span>
            <span className="text-[11px] text-muted-foreground">
              {isSubscribed ? 'Push notifications are on' : 'Get notified of updates'}
            </span>
          </div>
        </div>
        <Switch
          checked={isSubscribed}
          onCheckedChange={handleToggle}
          disabled={loading || toggling}
        />
      </div>

      {canSendTest && (
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={handleSendTest}
          disabled={!isSubscribed || sendingTest || loading}
        >
          {sendingTest ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Bell className="h-4 w-4 mr-2" />}
          Send Test Push to This Device
        </Button>
      )}
    </div>
  );
}


// Section header for grouping profile items
function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] uppercase tracking-[1.2px] text-muted-foreground font-semibold pt-3 pb-1 px-1">
      {children}
    </p>
  );
}

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
  const { subscription, daysRemaining } = useSubscription();
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
  const [showAIInsights, setShowAIInsights] = useState(false);
  const [showInstallSheet, setShowInstallSheet] = useState(false);
  
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
  if (authLoading || profileLoading) {
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
            <img src={nevoraLogo} alt="Enarsia Logo" className="h-10 w-10 rounded-xl object-cover shadow-md" />
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
                      {isPro && daysRemaining > 7 && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                          <Crown className="h-3 w-3" />
                          Pro
                        </span>}
                      {isPro && daysRemaining > 0 && daysRemaining <= 7 && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/40">
                          <Crown className="h-3 w-3" />
                          Pro · {daysRemaining}d left
                        </span>}
                      {!isPro && subscription?.expires_at && new Date(subscription.expires_at) <= new Date() && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-destructive/10 text-destructive border border-destructive/30">
                          <Clock className="h-3 w-3" />
                          Pro Expired
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

          {/* Subscription Status Banner - expiry warnings + expired renewal */}
          <SubscriptionStatusBanner />
          
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

          {/* ⭐ Enarsia Academy — featured entry (premium 3D on mobile, refined on desktop) */}
          <button
            onClick={() => navigate('/academy')}
            className="group relative w-full overflow-hidden rounded-2xl p-[1.5px] bg-gradient-to-br from-amber-400 via-fuchsia-500 to-indigo-500 shadow-[0_10px_30px_-10px_rgba(168,85,247,0.35)] hover:shadow-[0_18px_40px_-12px_rgba(168,85,247,0.55)] active:scale-[0.98] transition-all duration-200 md:from-primary/40 md:via-primary/30 md:to-primary/40"
          >
            <div className="relative rounded-[14px] bg-gradient-to-br from-indigo-950 via-slate-900 to-fuchsia-950 md:bg-card md:from-card md:via-card md:to-card px-4 py-3.5 flex items-center justify-between overflow-hidden">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(255,255,255,0.18),transparent_50%)] md:hidden" />
              <div className="pointer-events-none absolute -right-6 -bottom-8 h-28 w-28 rounded-full bg-amber-400/20 blur-2xl md:hidden" />
              <div className="pointer-events-none absolute -left-6 -top-8 h-24 w-24 rounded-full bg-fuchsia-500/20 blur-2xl md:hidden" />
              <div className="relative flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-300 to-orange-500 shadow-lg shadow-amber-500/40 ring-1 ring-white/30 md:from-primary md:to-primary md:shadow-primary/30 md:ring-primary/20">
                  <GraduationCap className="h-5 w-5 text-white drop-shadow" />
                </div>
                <div className="text-left">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-[15px] text-white md:text-foreground tracking-tight">Enarsia Academy</span>
                    <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-amber-400 text-amber-950">NEW</span>
                  </div>
                  <span className="text-[11px] text-white/70 md:text-muted-foreground">Free video tutorials · Learn the CRM</span>
                </div>
              </div>
              <ChevronRight className="relative h-4 w-4 text-white/80 md:text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
            </div>
          </button>

          {/* Bio only - phone/company/location hidden for cleaner UI */}
          {profile?.bio && (
            <div className="rounded-2xl p-4 bg-card border border-border/50">
              <p className="text-xs text-muted-foreground mb-1">Bio</p>
              <p className="text-sm">{profile.bio}</p>
            </div>
          )}


          {/* ── SECTION: Profession (renders its own header, or nothing) ── */}
          <ModeSwitcher />

          {/* ── SECTION: Tools ────────────────── */}
          <SectionHeader>Tools</SectionHeader>
          <div data-onboarding="profile-tools" className="space-y-2">
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
          </div>{/* end data-onboarding="profile-tools" */}

          {/* ── SECTION: Leads & AI ───────────── */}
          <SectionHeader>Leads & AI</SectionHeader>
          <div className="space-y-2">
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
                  Enarsia AI Assistant
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

          {/* AI Insights Settings */}
          <button
            onClick={() => setShowAIInsights(true)}
            className="w-full rounded-xl px-4 py-2.5 bg-gradient-to-r from-primary/15 to-primary/5 backdrop-blur-sm border border-primary/20 flex items-center justify-between transition-all duration-200 hover:shadow-md"
          >
            <div className="flex items-center gap-3">
              <div className="p-1.5 rounded-lg bg-primary/10">
                <BrainCircuit className="h-4 w-4 text-primary" />
              </div>
              <div className="text-left">
                <span className="font-medium text-sm block">AI Insights</span>
                <span className="text-[11px] text-muted-foreground">Trackers, alerts & coaching</span>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>
          </div>{/* end Leads & AI */}


          {/* ── SECTION: Account ──────────────── */}
          <SectionHeader>Account</SectionHeader>
          <div className="space-y-2">
          {/* Tracking Format - Full page */}
          <button
            onClick={() => navigate('/tracking-format')}
            className="w-full rounded-xl px-4 py-2 bg-card border border-border/50 flex items-center justify-between transition-colors hover:bg-muted/50"
          >
            <div className="flex items-center gap-2.5">
              <Sliders className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium text-sm">Tracking Format</span>
            </div>
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
          </button>

          {/* Notifications Toggle */}
          <NotificationToggle canSendTest={isAdmin} />

          {/* Export My Data */}
          <button
            onClick={() => navigate('/profile/export')}
            className="w-full rounded-xl px-4 py-2 bg-card border border-border/50 flex items-center justify-between transition-colors hover:bg-muted/50"
          >
            <div className="flex items-center gap-2.5">
              <FileText className="h-4 w-4 text-primary" />
              <div className="flex flex-col items-start">
                <span className="font-medium text-sm">Export My Data</span>
                <span className="text-[11px] text-muted-foreground">Download leads by month, week, or sheet</span>
              </div>
            </div>
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
          </button>

          {/* Recently Deleted */}
          <RecentlyDeletedRow />
          </div>{/* end Account */}

          {/* ── SECTION: Settings & Support ───── */}
          <SectionHeader>Settings & Support</SectionHeader>
          <div className="space-y-2">

          {/* Theme — top-level, always visible */}
          <ThemeSettings />

          <Collapsible className="rounded-xl bg-card border border-border/50 overflow-hidden">
            <CollapsibleTrigger className="w-full px-4 py-2 flex items-center justify-between hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-2.5">
                <Settings className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium text-sm">Settings</span>
              </div>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground transition-transform [[data-state=open]>&]:rotate-180" />
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="px-4 pb-3 space-y-0.5">
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

          {/* Install App */}
          <button
            onClick={() => setShowInstallSheet(true)}
            className="w-full rounded-xl bg-card border border-border/50 px-4 py-2.5 flex items-center justify-between hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <Smartphone className="h-4 w-4 text-primary" />
              <div className="flex flex-col items-start">
                <span className="font-medium text-sm">Install App</span>
                <span className="text-[11px] text-muted-foreground">Add Enarsia to your Home Screen</span>
              </div>
            </div>
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
          </button>


          {/* User Guide */}
          <UserGuideDrawer />

          {/* Help & Support */}
          <HelpSupportDrawer />

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
          </div>{/* end Settings & Support */}

          {/* ── SECTION: Community ────────────── */}
          <SectionHeader>Community</SectionHeader>
          {/* Join WhatsApp Community */}
          <a
            href="https://chat.whatsapp.com/FvNbWgFVR2IFBq6ihWhTs2"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between w-full px-3 py-2.5 rounded-xl bg-[hsl(142,70%,95%)] dark:bg-[hsl(142,40%,15%)] border border-[hsl(142,60%,80%)] dark:border-[hsl(142,30%,25%)] hover:opacity-90 transition-opacity"
          >
            <div className="flex items-center gap-2.5">
              <svg viewBox="0 0 24 24" className="h-4 w-4 text-[hsl(142,70%,45%)]" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              <span className="font-medium text-sm">Join WhatsApp Community</span>
            </div>
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
          </a>

          {/* Sign Out */}
          <Button variant="destructive" className="w-full h-10 rounded-xl shadow-md shadow-destructive/20 mt-1" onClick={handleSignOut}>
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </main>

      <EditProfileDialog open={editOpen} onOpenChange={setEditOpen} profile={profile} onSave={updateProfile} updating={updating} />

      <AIAssistantChat open={showAIChat} onOpenChange={setShowAIChat} />
      <AIInsightsSettings open={showAIInsights} onOpenChange={setShowAIInsights} />
      <InstallInstructionsSheet open={showInstallSheet} onClose={() => setShowInstallSheet(false)} />

      

      <BottomNav />
    </div>;
}

// Slim row that opens the full-screen Recently Deleted page with a count badge
function RecentlyDeletedRow() {
  const navigate = useNavigate();
  const { batches } = useDeletionBatches();
  const count = batches.length;

  return (
    <button
      onClick={() => navigate('/recently-deleted')}
      className="w-full rounded-xl px-4 py-2 bg-card border border-border/50 flex items-center justify-between transition-colors hover:bg-muted/50"
    >
      <div className="flex items-center gap-2.5">
        <Trash2 className="h-4 w-4 text-destructive" />
        <span className="font-medium text-sm">Recently Deleted</span>
        {count > 0 && (
          <span className="ml-1 inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-destructive text-destructive-foreground text-[11px] font-semibold">
            {count}
          </span>
        )}
      </div>
      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
    </button>
  );
}