import { useState, useEffect, useCallback, startTransition, useRef, type ComponentType } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useProfile } from '@/hooks/useProfile';
import { useMode } from '@/hooks/useMode';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Crown, Lightbulb, FilePen, Send, BarChart3, LayoutDashboard, LayoutGrid, Megaphone, TrendingUp } from 'lucide-react';
import { useUpgradeUrgency } from '@/lib/planUtils';
import { UpgradeDrawer } from '@/components/subscription/UpgradeDrawer';

const CallingIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.362 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.338 1.85.573 2.81.7A2 2 0 0122 16.92z" />
  </svg>
);

const FollowUpIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="7" r="4" />
    <path d="M5.5 21v-2a6.5 6.5 0 0113 0v2" />
    <circle cx="18" cy="17" r="4" fill="currentColor" stroke="none" />
    <path d="M16 17l1.5 1.5 3-3" stroke="hsl(var(--background))" strokeWidth="2" fill="none" />
  </svg>
);

const TodoListIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 11l3 3L22 4" />
    <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
  </svg>
);

const TrackUpIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 3v18h18" />
    <path d="M18 17V9" />
    <path d="M13 17V5" />
    <path d="M8 17v-3" />
  </svg>
);

/**
 * Maps a mode nav item's `iconKey` to its icon component. Network-marketing
 * keys use the original custom SVGs; other modes reuse those or lucide icons.
 * Items with `isProfile` render the avatar instead (no icon lookup needed).
 */
const ICONS: Record<string, ComponentType<{ className?: string }>> = {
  calling: CallingIcon,
  followup: FollowUpIcon,
  todo: TodoListIcon,
  trackup: TrackUpIcon,
  growth: TrackUpIcon,
  overview: LayoutDashboard,
  ideas: Lightbulb,
  studio: FilePen,
  scripting: FilePen,
  calendar: Send,
  posting: Send,
  insights: BarChart3,
  manage: LayoutGrid,
  marketing: Megaphone,
  sales: TrendingUp,
};

export function BottomNav({ className }: { className?: string }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile } = useProfile();
  const { mode } = useMode();
  const navItems = mode.nav;
  const { isUrgent, isExpired, isAtLeadLimit } = useUpgradeUrgency();
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [bouncingTab, setBouncingTab] = useState<string | null>(null);

  useEffect(() => {
    const handleResize = () => {
      const isKeyboardOpen = window.visualViewport
        ? window.visualViewport.height < window.innerHeight * 0.75
        : false;
      setKeyboardVisible(isKeyboardOpen);
    };
    window.visualViewport?.addEventListener('resize', handleResize);
    return () => window.visualViewport?.removeEventListener('resize', handleResize);
  }, []);

  const displayName = profile?.display_name || 'User';
  const userInitials = displayName.slice(0, 2).toUpperCase();

  if (keyboardVisible) return null;

  const handleNavClick = (path: string, isActive: boolean) => {
    if (!isActive) {
      setBouncingTab(path);
      setTimeout(() => setBouncingTab(null), 300);
      startTransition(() => {
        navigate(path);
      });
    }
  };

  const isCreator = mode.id === 'content_creator';
  return (
    <nav
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50",
        "bg-card/85 backdrop-blur-2xl",
        "border-t border-border/50",
        isCreator ? "pb-[max(env(safe-area-inset-bottom),12px)]" : "pb-[10px]",
        className
      )}
    >
      {isUrgent && (
        <div className="px-3 pt-2 pb-1 max-w-lg mx-auto">
          <div className="flex items-center gap-2 rounded-xl px-3 py-2 bg-gradient-to-r from-amber-500/15 via-amber-500/10 to-transparent border border-amber-500/40">
            <Crown className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <p className="text-[11px] font-semibold text-amber-800 dark:text-amber-200 flex-1 truncate">
              {isExpired ? 'Pro plan expired — renew to continue' : isAtLeadLimit ? 'Free limit reached — upgrade to add more' : 'Trial ended — upgrade to keep access'}
            </p>
            <UpgradeDrawer variant="compact" triggerText={isExpired ? 'Renew' : 'Upgrade'} />
          </div>
        </div>
      )}
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
        {navItems.map(item => {
          const Icon = ICONS[item.iconKey];
          const isActive = location.pathname === item.path;
          const isBouncing = bouncingTab === item.path;

          return (
            <button
              key={item.path}
              data-onboarding={item.onboardingId}
              onClick={() => handleNavClick(item.path, isActive)}
              className={cn(
                "relative flex flex-col items-center justify-center flex-1 h-full min-h-[44px] min-w-[44px]",
                "transition-all duration-200",
                isActive ? "text-primary" : "text-muted-foreground",
                "pb-[8px]"
              )}
            >
              <div
                className={cn(
                  "flex flex-col items-center gap-0.5",
                  isBouncing && "tab-bounce",
                )}
              >
                {item.isProfile ? (
                  <Avatar className={cn(
                    "h-6 w-6 transition-all duration-200",
                    isActive && "ring-2 ring-primary ring-offset-1 ring-offset-background"
                  )}>
                    <AvatarImage src={profile?.avatar_url || undefined} alt={displayName} />
                    <AvatarFallback className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground text-[10px] font-bold">
                      {userInitials}
                    </AvatarFallback>
                  </Avatar>
                ) : Icon && <Icon className="h-6 w-6" />}
                <span className={cn(
                  "text-[11px] font-body",
                  isActive ? "text-primary font-bold" : "text-muted-foreground font-medium"
                )}>
                  {item.label}
                </span>
              </div>
              <div className={cn(
                "absolute bottom-1.5 left-1/2 -translate-x-1/2 h-[3px] w-1 rounded-full transition-all duration-200",
                isActive ? "bg-primary scale-100" : "bg-transparent scale-0"
              )} />
            </button>
          );
        })}
      </div>
    </nav>
  );
}
