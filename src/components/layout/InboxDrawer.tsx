import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useInbox, InboxMessage } from '@/hooks/useInbox';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetClose } from '@/components/ui/sheet';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerClose } from '@/components/ui/drawer';
import { Bell, Loader2, X, Archive, ExternalLink, ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, formatDistanceToNow } from 'date-fns';

interface InboxDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InboxDrawer({ open, onOpenChange }: InboxDrawerProps) {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { messages, loading, markAsRead, archiveMessage } = useInbox();
  const [selectedMessage, setSelectedMessage] = useState<InboxMessage | null>(null);

  const handleOpenMessage = async (message: InboxMessage) => {
    setSelectedMessage(message);
    if (!message.read_at) {
      await markAsRead(message.id);
    }
  };

  const handleBack = () => {
    setSelectedMessage(null);
  };

  const handleArchive = async () => {
    if (selectedMessage) {
      await archiveMessage(selectedMessage.id);
      setSelectedMessage(null);
    }
  };

  const handleDeepLink = () => {
    if (selectedMessage?.deep_link_route) {
      onOpenChange(false);
      setSelectedMessage(null);
      navigate(selectedMessage.deep_link_route);
    }
  };

  const handleClose = () => {
    setSelectedMessage(null);
    onOpenChange(false);
  };

  // Message detail view
  const messageDetailContent = selectedMessage && (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 p-4 border-b border-border/50">
        <button
          onClick={handleBack}
          className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="h-5 w-5" />
          <span className="text-sm">Back</span>
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div>
          <h2 className="text-lg font-bold mb-2">{selectedMessage.title}</h2>
          <p className="text-xs text-muted-foreground mb-4">
            {format(new Date(selectedMessage.created_at), 'PPP p')}
          </p>
          <p className="text-foreground whitespace-pre-wrap">{selectedMessage.body}</p>
        </div>
        <div className="flex gap-3 pt-4">
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
    </div>
  );

  // Message list content
  const listContent = (
    <div className="flex-1 overflow-y-auto">
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : messages.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center px-4">
          <div className="p-4 rounded-full bg-muted/50 mb-4">
            <Bell className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="font-semibold text-lg mb-1">No messages yet</h3>
          <p className="text-sm text-muted-foreground">Messages from your leader will appear here</p>
        </div>
      ) : (
        <div className="p-4 space-y-3">
          {messages.map(message => (
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
          ))}
        </div>
      )}
    </div>
  );

  // Mobile: Bottom sheet (Drawer)
  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={(newOpen) => {
        if (!newOpen) handleClose();
        else onOpenChange(newOpen);
      }}>
        <DrawerContent className="max-h-[85vh] flex flex-col">
          {selectedMessage ? (
            messageDetailContent
          ) : (
            <>
              <DrawerHeader className="border-b border-border/50">
                <div className="flex items-center justify-between">
                  <div>
                    <DrawerTitle className="flex items-center gap-2">
                      <Bell className="h-4 w-4" />
                      Inbox
                    </DrawerTitle>
                    <DrawerDescription>
                      Messages from your leader
                    </DrawerDescription>
                  </div>
                  <DrawerClose asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <X className="h-4 w-4" />
                    </Button>
                  </DrawerClose>
                </div>
              </DrawerHeader>
              {listContent}
            </>
          )}
        </DrawerContent>
      </Drawer>
    );
  }

  // Desktop: Right-side sheet
  return (
    <Sheet open={open} onOpenChange={(newOpen) => {
      if (!newOpen) handleClose();
      else onOpenChange(newOpen);
    }}>
      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col p-0">
        {selectedMessage ? (
          messageDetailContent
        ) : (
          <>
            <SheetHeader className="border-b border-border/50 p-4">
              <SheetTitle className="flex items-center gap-2">
                <Bell className="h-4 w-4" />
                Inbox
              </SheetTitle>
              <SheetDescription>
                Messages from your leader
              </SheetDescription>
            </SheetHeader>
            {listContent}
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
