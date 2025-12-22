import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useInbox, InboxMessage } from '@/hooks/useInbox';
import { BottomNav } from '@/components/layout/BottomNav';
import { PullToRefreshIndicator } from '@/components/PullToRefreshIndicator';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Loader2, Bell, Archive, ExternalLink, ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, formatDistanceToNow } from 'date-fns';
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
    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: true });
    container.addEventListener('touchend', handleTouchEnd);
    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);
  
  return { containerRef, isRefreshing, pullDistance, showIndicator: pullDistance > 20 || isRefreshing };
}

export default function Inbox() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { messages, loading, fetchMessages, markAsRead, archiveMessage } = useInbox();
  const [selectedMessage, setSelectedMessage] = useState<InboxMessage | null>(null);

  // Pull-to-refresh
  const handleRefresh = useCallback(async () => {
    await fetchMessages();
  }, [fetchMessages]);
  
  const { containerRef, isRefreshing, pullDistance, showIndicator } = usePullToRefresh(handleRefresh);

  useEffect(() => {
    if (!user && !authLoading) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  const handleOpenMessage = async (message: InboxMessage) => {
    setSelectedMessage(message);
    if (!message.read_at) {
      await markAsRead(message.id);
    }
  };

  const handleArchive = async () => {
    if (selectedMessage) {
      await archiveMessage(selectedMessage.id);
      setSelectedMessage(null);
    }
  };

  const handleDeepLink = () => {
    if (selectedMessage?.deep_link_route) {
      navigate(selectedMessage.deep_link_route);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  // Message detail view
  if (selectedMessage) {
    return (
      <div className="app-layout bg-gradient-to-b from-background via-background to-muted/20">
        <header className="fixed-header z-40 bg-card/80 backdrop-blur-xl border-b border-border/50">
          <div className="flex items-center justify-between px-4 py-3">
            <button 
              onClick={() => setSelectedMessage(null)}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronLeft className="h-5 w-5" />
              <span>Back</span>
            </button>
          </div>
        </header>

        <main className="scrollable-content">
          <div className="container py-4 px-4 pb-20 space-y-4">
            <div className="rounded-2xl p-5 bg-card border border-border/50">
              <h1 className="text-xl font-bold mb-2">{selectedMessage.title}</h1>
              <p className="text-xs text-muted-foreground mb-4">
                {format(new Date(selectedMessage.created_at), 'PPP p')}
              </p>
              <p className="text-foreground whitespace-pre-wrap">{selectedMessage.body}</p>
            </div>

            <div className="flex gap-3">
              {selectedMessage.deep_link_route && (
                <Button onClick={handleDeepLink} className="flex-1">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open
                </Button>
              )}
              <Button variant="outline" onClick={handleArchive} className="flex-1">
                <Archive className="h-4 w-4 mr-2" />
                Archive
              </Button>
            </div>
          </div>
        </main>

        <BottomNav />
      </div>
    );
  }

  // Message list view
  return (
    <div className="app-layout bg-gradient-to-b from-background via-background to-muted/20">
      <header className="fixed-header z-40 bg-card/80 backdrop-blur-xl border-b border-border/50">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <img src={nevoraLogo} alt="NevorAI Logo" className="h-10 w-10 rounded-xl object-cover shadow-md" />
            <div>
              <h1 className="text-xl font-bold tracking-tight">Inbox</h1>
              <p className="text-xs text-muted-foreground font-medium">Messages from your leader</p>
            </div>
          </div>
        </div>
      </header>

      <main ref={containerRef} className="scrollable-content relative">
        <PullToRefreshIndicator isRefreshing={isRefreshing} pullDistance={pullDistance} showIndicator={showIndicator} />
        <div className="container py-3 px-4 space-y-3 pb-20">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="p-4 rounded-full bg-muted/50 mb-4">
                <Bell className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="font-semibold text-lg mb-1">No messages yet</h3>
              <p className="text-sm text-muted-foreground">Messages from your leader will appear here</p>
            </div>
          ) : (
            messages.map(message => (
              <Card
                key={message.id}
                onClick={() => handleOpenMessage(message)}
                className={cn(
                  "p-4 cursor-pointer transition-all hover:shadow-md",
                  !message.read_at && "border-primary/50 bg-primary/5"
                )}
              >
                <div className="flex items-start gap-3">
                  {!message.read_at && (
                    <div className="h-2 w-2 rounded-full bg-primary mt-2 shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className={cn(
                      "font-medium truncate",
                      !message.read_at && "font-semibold"
                    )}>
                      {message.title}
                    </h3>
                    <p className="text-sm text-muted-foreground line-clamp-1 mt-0.5">
                      {message.body}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
