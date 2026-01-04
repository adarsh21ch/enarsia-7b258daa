import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useInbox } from '@/hooks/useInbox';
import { useDirectTeam } from '@/hooks/useDirectTeam';
import { Bell, Send } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SendMessageDrawer } from './SendMessageDrawer';
import { InboxDrawer } from './InboxDrawer';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export function HeaderBellIcon() {
  const location = useLocation();
  const { unreadCount } = useInbox();
  const { hasDirectTeam, loading: teamLoading } = useDirectTeam();
  const [sendDrawerOpen, setSendDrawerOpen] = useState(false);
  const [inboxDrawerOpen, setInboxDrawerOpen] = useState(false);

  // Don't show bell on inbox page itself
  const isInboxPage = location.pathname === '/inbox';

  // Show send message icon only for leaders with direct team
  const showSendMessage = !teamLoading && hasDirectTeam;

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex items-center gap-1">
        {/* Send Message Icon - Only for leaders with direct team */}
        {showSendMessage && (
          <>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setSendDrawerOpen(true)}
                  className="relative p-2 rounded-lg hover:bg-muted/50 transition-colors"
                  aria-label="Send message to team"
                >
                  <Send className="h-5 w-5 text-muted-foreground" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>Send message</p>
              </TooltipContent>
            </Tooltip>

            <SendMessageDrawer 
              open={sendDrawerOpen} 
              onOpenChange={setSendDrawerOpen} 
            />
          </>
        )}

        {/* Bell Icon */}
        {!isInboxPage && (
          <>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setInboxDrawerOpen(true)}
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
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>Inbox</p>
              </TooltipContent>
            </Tooltip>

            <InboxDrawer
              open={inboxDrawerOpen}
              onOpenChange={setInboxDrawerOpen}
            />
          </>
        )}
      </div>
    </TooltipProvider>
  );
}
