import { useState, useEffect, useCallback, startTransition, useRef } from 'react';
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

export function BottomNav({ className }: { className?: string }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile } = useProfile();
  const { currentStep, isOnboarding, requiredTab } = useOnboarding();
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

  const activeRequiredPath = isOnboarding ? requiredTab(currentStep) : null;

  const handleNavClick = (path: string, isActive: boolean) => {
    // During onboarding, only allow the required tab (unless it's the nav step itself)
    if (isOnboarding && activeRequiredPath && path !== activeRequiredPath) {
      // Check if this nav item IS the target of the current step
      const navItem = navItems.find(n => n.path === path);
      const stepSelector = `[data-onboarding="${navItem?.onboardingId}"]`;
      // Allow click if this tab IS the onboarding target
      const isStepTarget = currentStep === 4 && path === '/listup'
        || currentStep === 7 && path === '/tracking'
        || currentStep === 9 && path === '/dashboard';
      if (!isStepTarget) return;
    }
    
    if (!isActive) {
      setBouncingTab(path);
      setTimeout(() => setBouncingTab(null), 300);
      startTransition(() => {
        navigate(path);
      });
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
      style={{ zIndex: isOnboarding ? 310 : undefined }}
    >
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          const isBouncing = bouncingTab === item.path;
          
          // Tab locking during onboarding
          const isLocked = isOnboarding && activeRequiredPath && item.path !== activeRequiredPath
            // But don't lock if this tab IS the step target for navigation steps
            && !(currentStep === 4 && item.path === '/listup')
            && !(currentStep === 7 && item.path === '/tracking')
            && !(currentStep === 9 && item.path === '/dashboard');

          return (
            <button
              key={item.path}
              data-onboarding={item.onboardingId}
              onClick={() => handleNavClick(item.path, isActive)}
              className={cn(
                "relative flex flex-col items-center justify-center flex-1 h-full min-h-[44px] min-w-[44px]",
                "transition-all duration-200",
                isActive ? "text-primary" : "text-muted-foreground",
                isLocked && "opacity-[0.35] grayscale pointer-events-none",
                "pb-[8px]"
              )}
            >
              <div
                className={cn(
                  "flex flex-col items-center gap-0.5",
                  isBouncing && "tab-bounce"
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
              {/* Active dot / pulsing blue dot for required tab */}
              {isOnboarding && !isLocked && !isActive && (
                <div className="absolute top-2 right-1/2 translate-x-3 h-2 w-2 rounded-full bg-[#2563EB] animate-pulse" />
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
