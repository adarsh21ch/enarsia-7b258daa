import { useState, useEffect, useCallback, startTransition } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useProfile } from '@/hooks/useProfile';
import { useOnboarding } from '@/hooks/useOnboarding';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

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

const navItems = [
  { path: '/dashboard', icon: CallingIcon, label: 'Calling', onboardingId: 'nav-calling' },
  { path: '/listup', icon: FollowUpIcon, label: 'Follow-Up', onboardingId: 'nav-followup' },
  { path: '/action', icon: TodoListIcon, label: 'To-Do', onboardingId: 'nav-todo' },
  { path: '/tracking', icon: TrackUpIcon, label: 'TrackUp', onboardingId: 'nav-trackup' },
  { path: '/profile', icon: null, label: 'Profile', isProfile: true, onboardingId: 'nav-profile' },
];

// Map of onboarding step → the nav path that should be the ONLY tappable target
const ACTION_STEP_TARGETS: Record<number, string> = {
  5: '/listup',    // Step 5: tap Follow-Up
  8: '/tracking',  // Step 8: tap TrackUp
};

export function BottomNav({ className }: { className?: string }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile } = useProfile();
  const { currentStep, isOnboarding } = useOnboarding();
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

  // During action steps, only the target tab is enabled
  const actionTarget = isOnboarding ? ACTION_STEP_TARGETS[currentStep] || null : null;

  const isTabAllowed = (path: string): boolean => {
    if (!isOnboarding) return true;
    // If it's an action step with a nav target, only that target tab is allowed
    if (actionTarget) return path === actionTarget;
    // For other onboarding steps, keep current tab active (no nav changes)
    return path === location.pathname;
  };

  const handleNavClick = (path: string, isActive: boolean) => {
    if (isOnboarding && !isTabAllowed(path)) return;
    if (!isActive) {
      setBouncingTab(path);
      setTimeout(() => setBouncingTab(null), 300);
      startTransition(() => { navigate(path); });
    }
  };

  return (
    <nav
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50",
        "bg-card/85 backdrop-blur-2xl",
        "border-t border-border/50",
        "pb-[10px]",
        className
      )}
      style={{ zIndex: isOnboarding ? 9500 : undefined }}
    >
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          const isBouncing = bouncingTab === item.path;
          const isLocked = isOnboarding && !isTabAllowed(item.path);
          const isPulsingTarget = isOnboarding && actionTarget === item.path && !isActive;

          return (
            <button
              key={item.path}
              data-onboarding={item.onboardingId}
              onClick={() => handleNavClick(item.path, isActive)}
              className={cn(
                "relative flex flex-col items-center justify-center flex-1 h-full min-h-[44px] min-w-[44px]",
                "transition-all duration-200",
                isActive ? "text-primary" : "text-muted-foreground",
                isLocked && "opacity-40 grayscale",
                "pb-[8px]"
              )}
              style={isLocked ? { pointerEvents: 'none' } : undefined}
            >
              <div
                className={cn(
                  "flex flex-col items-center gap-0.5",
                  isBouncing && "tab-bounce",
                  isPulsingTarget && "animate-pulse"
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
              {/* Pulsing blue dot for action step target */}
              {isPulsingTarget && (
                <div className="absolute top-1.5 right-1/2 translate-x-4 h-2.5 w-2.5 rounded-full bg-primary"
                  style={{ boxShadow: '0 0 0 3px hsl(var(--primary) / 0.3)', animation: 'onboarding-pulse-ring 1.5s ease-in-out infinite' }}
                />
              )}
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
