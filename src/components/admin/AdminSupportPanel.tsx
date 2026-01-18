import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useAdminSupportTickets, TicketStatus, SupportTicket } from '@/hooks/useSupportTickets';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Loader2, MessageSquare, Clock, CheckCircle, Search, User, Mail, IdCard, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const STATUS_CONFIG: Record<TicketStatus, { label: string; color: string; icon: React.ElementType }> = {
  pending: { label: 'Pending', color: 'bg-amber-500/10 text-amber-600 border-amber-500/30', icon: Clock },
  in_review: { label: 'In Review', color: 'bg-blue-500/10 text-blue-600 border-blue-500/30', icon: Search },
  resolved: { label: 'Resolved', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30', icon: CheckCircle },
};

const QUICK_REPLIES = [
  "We've received your request and are reviewing it.",
  "Thanks for reporting this. Our team is checking it.",
  "This issue has been resolved. Please try again.",
  "We'll update you shortly. Thanks for your patience.",
];

const CATEGORY_LABELS: Record<string, string> = {
  app_issue: 'App Issue',
  training_help: 'Training / Business Help',
  payment: 'Payment / Subscription',
  other: 'Other Query',
};

export function AdminSupportPanel() {
  const { user } = useAuth();
  const {
    tickets,
    isLoading,
    statusFilter,
    setStatusFilter,
    updateStatus,
    addReply,
    isUpdating,
    isReplying,
  } = useAdminSupportTickets();

  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [replyText, setReplyText] = useState('');
  const [newStatus, setNewStatus] = useState<TicketStatus | ''>('');

  const handleOpenTicket = (ticket: SupportTicket) => {
    setSelectedTicket(ticket);
    setNewStatus(ticket.status);
    setReplyText('');
  };

  const handleCloseTicket = () => {
    setSelectedTicket(null);
    setReplyText('');
    setNewStatus('');
  };

  const handleQuickReply = (text: string) => {
    setReplyText(text);
  };

  const handleSendReply = async () => {
    if (!selectedTicket || !replyText.trim() || !user) return;

    await addReply({
      ticketId: selectedTicket.id,
      message: replyText.trim(),
      userId: user.id,
    });

    setReplyText('');
  };

  const handleUpdateStatus = async () => {
    if (!selectedTicket || !newStatus || newStatus === selectedTicket.status) return;

    await updateStatus({
      ticketId: selectedTicket.id,
      status: newStatus,
    });

    setSelectedTicket(prev => prev ? { ...prev, status: newStatus } : null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter Bar */}
      <div className="flex items-center gap-3">
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as TicketStatus | 'all')}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Filter status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Tickets</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="in_review">In Review</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">
          {tickets.length} ticket{tickets.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Tickets List */}
      <div className="rounded-xl bg-card border border-border/50 overflow-hidden">
        {tickets.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>No tickets found</p>
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {tickets.map((ticket) => {
              const statusConfig = STATUS_CONFIG[ticket.status];
              const StatusIcon = statusConfig.icon;
              
              return (
                <button
                  key={ticket.id}
                  onClick={() => handleOpenTicket(ticket)}
                  className="w-full p-4 text-left hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className={cn('text-xs', statusConfig.color)}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {statusConfig.label}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {CATEGORY_LABELS[ticket.category] || ticket.category}
                        </Badge>
                      </div>
                      <p className="font-medium truncate">{ticket.subject}</p>
                      <p className="text-sm text-muted-foreground truncate mt-0.5">
                        {ticket.user_name} • {ticket.user_email}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(new Date(ticket.created_at), 'dd MMM yyyy, hh:mm a')}
                      </p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Ticket Detail Dialog */}
      <Dialog open={!!selectedTicket} onOpenChange={(open) => !open && handleCloseTicket()}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          {selectedTicket && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedTicket.subject}</DialogTitle>
                <DialogDescription>
                  {CATEGORY_LABELS[selectedTicket.category]} • {format(new Date(selectedTicket.created_at), 'dd MMM yyyy, hh:mm a')}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 mt-4">
                {/* User Info */}
                <div className="p-3 rounded-lg bg-muted/50 space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span>{selectedTicket.user_name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span>{selectedTicket.user_email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <IdCard className="h-4 w-4 text-muted-foreground" />
                    <span className="font-mono">{selectedTicket.user_neverai_id}</span>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <p className="text-sm font-medium mb-2">Description</p>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {selectedTicket.description}
                  </p>
                </div>

                {/* Status Update */}
                <div>
                  <p className="text-sm font-medium mb-2">Status</p>
                  <div className="flex items-center gap-2">
                    <Select value={newStatus} onValueChange={(v) => setNewStatus(v as TicketStatus)}>
                      <SelectTrigger className="w-[140px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="in_review">In Review</SelectItem>
                        <SelectItem value="resolved">Resolved</SelectItem>
                      </SelectContent>
                    </Select>
                    {newStatus && newStatus !== selectedTicket.status && (
                      <Button size="sm" onClick={handleUpdateStatus} disabled={isUpdating}>
                        {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Update'}
                      </Button>
                    )}
                  </div>
                </div>

                {/* Quick Reply Templates */}
                <div>
                  <p className="text-sm font-medium mb-2">Quick Replies</p>
                  <div className="flex flex-wrap gap-2">
                    {QUICK_REPLIES.map((text, i) => (
                      <button
                        key={i}
                        onClick={() => handleQuickReply(text)}
                        className="text-xs px-3 py-1.5 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                      >
                        {text.slice(0, 30)}...
                      </button>
                    ))}
                  </div>
                </div>

                {/* Reply Input */}
                <div>
                  <p className="text-sm font-medium mb-2">Reply</p>
                  <Textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Type your reply..."
                    rows={3}
                  />
                  <Button
                    className="w-full mt-2"
                    onClick={handleSendReply}
                    disabled={!replyText.trim() || isReplying}
                  >
                    {isReplying ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      'Send Reply'
                    )}
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
