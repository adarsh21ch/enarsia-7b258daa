import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useProfile } from '@/hooks/useProfile';
import { useInbox } from '@/hooks/useInbox';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

// Custom icons for premium visual representation - outline style only

// Phone/Calling icon
const CallingIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.362 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.338 1.85.573 2.81.7A2 2 0 0122 16.92z" />
  </svg>
);

// Activity/clock icon (Recent)
const ActivityIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

// Follow-up icon - single person with checkmark badge
const FollowUpIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    {/* Person silhouette */}
    <circle cx="12" cy="7" r="4" />
    <path d="M5.5 21v-2a6.5 6.5 0 0113 0v2" />
    {/* Checkmark badge at bottom-right */}
    <circle cx="18" cy="17" r="4" fill="currentColor" stroke="none" />
    <path d="M16 17l1.5 1.5 3-3" stroke="hsl(var(--background))" strokeWidth="2" fill="none" />
  </svg>
);

// Checklist/To-Do List icon
const TodoListIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 11l3 3L22 4" />
    <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
  </svg>
);

// Bell/Inbox icon
const InboxIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
);

// Tab order: Activity, Follow Up, Calling (default), To-Do List, Inbox, Profile (avatar)
const navItems = [
  { path: '/home', icon: ActivityIcon, label: 'Activity' },
  { path: '/listup', icon: FollowUpIcon, label: 'Follow Up' },
  { path: '/dashboard', icon: CallingIcon, label: 'Calling' },
  { path: '/action', icon: TodoListIcon, label: 'To-Do List' },
  { path: '/inbox', icon: InboxIcon, label: 'Inbox', showBadge: true },
  { path: '/profile', icon: null, label: 'Profile', isProfile: true },
];

export function BottomNav({ className }: { className?: string }) {
  const location = useLocation();
  const { profile } = useProfile();
  const { unreadCount } = useInbox();

  // Get user initials for avatar fallback
  const displayName = profile?.display_name || 'User';
  const userInitials = displayName.slice(0, 2).toUpperCase();

  return (
    <nav className={cn("fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-xl border-t border-border/50 safe-area-pb", className)}>
      {/* Raised position with extra padding for Instagram-like positioning */}
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto pb-3 pt-1">
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={cn(
                "relative flex flex-col items-center justify-center flex-1 h-full transition-all duration-200",
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <div className="relative flex flex-col items-center">
                {item.isProfile ? (
                  // Profile tab with avatar
                  <Avatar className={cn(
                    "h-6 w-6 transition-all duration-200",
                    isActive && "ring-2 ring-primary ring-offset-1 ring-offset-background"
                  )}>
                    <AvatarImage src={profile?.avatar_url || undefined} alt={displayName} />
                    <AvatarFallback className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground text-[10px] font-bold">
                      {userInitials}
                    </AvatarFallback>
                  </Avatar>
                ) : (
                  Icon && (
                    <div className="relative">
                      <Icon 
                        className={cn(
                          "h-6 w-6 transition-all duration-200",
                          isActive && "scale-105"
                        )} 
                      />
                      {/* Unread badge for inbox */}
                      {item.showBadge && unreadCount > 0 && (
                        <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold px-1">
                          {unreadCount > 99 ? '99+' : unreadCount}
                        </span>
                      )}
                    </div>
                  )
                )}
                {/* Active indicator bar below icon */}
                <div className={cn(
                  "mt-2 h-0.5 rounded-full transition-all duration-200",
                  isActive ? "w-5 bg-primary" : "w-0 bg-transparent"
                )} />
              </div>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
