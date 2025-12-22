import { useNavigate, useLocation } from 'react-router-dom';
import { useInbox } from '@/hooks/useInbox';
import { Bell } from 'lucide-react';
import { cn } from '@/lib/utils';

export function HeaderBellIcon() {
  const navigate = useNavigate();
  const location = useLocation();
  const { unreadCount } = useInbox();

  // Don't show on inbox page itself
  if (location.pathname === '/inbox') {
    return null;
  }

  return (
    <button
      onClick={() => navigate('/inbox')}
      className="relative p-2 rounded-lg hover:bg-muted/50 transition-colors"
      aria-label="Open inbox"
    >
      <Bell className="h-5 w-5 text-muted-foreground" />
      {unreadCount > 0 && (
        <span className={cn(
          "absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center",
          "rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold px-1"
        )}>
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </button>
  );
}
