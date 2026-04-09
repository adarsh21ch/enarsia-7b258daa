import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Send, Loader2, Bell, Users, Gift, AlertTriangle, Zap, Megaphone } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useAdminAnalytics } from '@/hooks/useAdminAnalytics';

const AUDIENCE_OPTIONS = [
  { value: 'all', label: 'All Users', icon: Users, emoji: '👥' },
  { value: 'basic', label: 'Pro Only', icon: Gift, emoji: '👑' },
  { value: 'free', label: 'Free Users', icon: Users, emoji: '🆓' },
  { value: 'trial', label: 'Trials', icon: AlertTriangle, emoji: '⏳' },
];

const MESSAGE_TEMPLATES = [
  { key: 'announcement', label: '📢 Announcement', title: 'New Feature Available!', body: 'We just launched something exciting. Open the app to check it out!' },
  { key: 'offer', label: '🎁 Offer', title: 'Special Offer for You!', body: 'Upgrade to Pro today and get an exclusive discount. Limited time only!' },
  { key: 'reminder', label: '⚠️ Reminder', title: 'Don\'t Miss Out!', body: 'Your trial is ending soon. Upgrade now to keep all your data and features.' },
  { key: 'reengage', label: '🔥 Re-engage', title: 'We Miss You!', body: 'It\'s been a while since you last used NevorAI. Come back and see what\'s new!' },
];

export function BroadcastTab() {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [selectedAudiences, setSelectedAudiences] = useState<string[]>(['all']);
  const [sending, setSending] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [subCount, setSubCount] = useState(0);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const { data: analytics } = useAdminAnalytics();

  useEffect(() => {
    fetchHistory();
    fetchSubCount();
  }, []);

  const fetchSubCount = async () => {
    const { count } = await supabase
      .from('push_subscriptions')
      .select('*', { count: 'exact', head: true });
    setSubCount(count || 0);
  };

  const fetchHistory = async () => {
    const { data } = await supabase
      .from('admin_notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);
    setHistory(data || []);
    setLoadingHistory(false);
  };

  const toggleAudience = (value: string) => {
    if (value === 'all') {
      setSelectedAudiences(['all']);
      return;
    }
    setSelectedAudiences(prev => {
      const without = prev.filter(v => v !== 'all' && v !== value);
      if (prev.includes(value)) {
        return without.length === 0 ? ['all'] : without;
      }
      return [...without, value];
    });
  };

  const applyTemplate = (template: typeof MESSAGE_TEMPLATES[0]) => {
    setTitle(template.title);
    setBody(template.body);
  };

  const getAudienceCount = () => {
    if (selectedAudiences.includes('all')) return subCount;
    // Rough estimate
    return subCount;
  };

  const getAudienceLabel = () => {
    if (selectedAudiences.includes('all')) return 'All Users';
    return selectedAudiences.map(a => AUDIENCE_OPTIONS.find(o => o.value === a)?.label).join(', ');
  };

  const handleSend = async () => {
    setConfirmOpen(false);
    setSending(true);
    try {
      const target = selectedAudiences.includes('all') ? 'all' : selectedAudiences[0] || 'all';
      const { data, error } = await supabase.functions.invoke('send-push-notification', {
        body: { title: title.trim(), body: body.trim(), target },
      });
      if (error) throw error;
      toast.success(`Notification sent: ${data?.sent || 0} delivered${data?.failed ? `, ${data.failed} failed` : ''}`);
      setTitle('');
      setBody('');
      fetchHistory();
      fetchSubCount();
    } catch (e: any) {
      toast.error('Failed to send: ' + (e.message || 'Unknown error'));
    } finally {
      setSending(false);
    }
  };

  const audienceCount = getAudienceCount();

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="flex gap-3">
        <div className="flex-1 rounded-2xl border border-border/50 bg-card p-4 flex items-center gap-3">
          <Users className="h-5 w-5 text-primary" />
          <div>
            <p className="text-2xl font-bold font-heading">{subCount}</p>
            <p className="text-[11px] text-muted-foreground">Active Subscribers</p>
          </div>
        </div>
        <div className="flex-1 rounded-2xl border border-border/50 bg-card p-4 flex items-center gap-3">
          <Bell className="h-5 w-5 text-primary" />
          <div>
            <p className="text-2xl font-bold font-heading">{history.length}</p>
            <p className="text-[11px] text-muted-foreground">Notifications Sent</p>
          </div>
        </div>
      </div>

      {/* Audience Selector — Visual Cards */}
      <div className="rounded-2xl border border-border/50 bg-card p-4 space-y-3">
        <h3 className="text-sm font-bold font-heading">Select Audience</h3>
        <div className="grid grid-cols-4 gap-2">
          {AUDIENCE_OPTIONS.map(opt => {
            const isSelected = selectedAudiences.includes(opt.value);
            let count = subCount;
            if (opt.value === 'basic') count = analytics?.activeProUsers || 0;
            else if (opt.value === 'free') count = analytics?.freeUsersCount || 0;

            return (
              <button
                key={opt.value}
                onClick={() => toggleAudience(opt.value)}
                className={`flex flex-col items-center gap-1 p-3 rounded-xl border transition-all text-center
                  ${isSelected
                    ? 'border-primary bg-primary/10 ring-1 ring-primary/30'
                    : 'border-border/50 bg-muted/30 hover:bg-muted/50'
                  }`}
              >
                <span className="text-lg">{opt.emoji}</span>
                <span className="text-[11px] font-semibold">{opt.label}</span>
                <span className="text-[10px] text-muted-foreground">{count.toLocaleString()} users</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Message Composer */}
      <div className="rounded-2xl border border-border/50 bg-card p-4 space-y-3">
        <h3 className="text-sm font-bold font-heading">Compose Message</h3>

        {/* Templates */}
        <div className="flex gap-2 flex-wrap">
          {MESSAGE_TEMPLATES.map(t => (
            <button
              key={t.key}
              onClick={() => applyTemplate(t)}
              className="text-[11px] px-2.5 py-1.5 rounded-lg border border-border/50 bg-muted/30 hover:bg-muted/60 transition-colors"
            >
              {t.label}
            </button>
          ))}
        </div>

        <Input
          placeholder="Notification title"
          value={title}
          onChange={e => setTitle(e.target.value)}
          maxLength={100}
          className="rounded-xl"
        />
        <Textarea
          placeholder="Notification body"
          value={body}
          onChange={e => setBody(e.target.value)}
          rows={3}
          maxLength={300}
          className="rounded-xl"
        />

        {/* Live Preview */}
        {(title || body) && (
          <div className="rounded-xl bg-muted/50 border border-border/30 p-3">
            <p className="text-[10px] text-muted-foreground mb-2 font-medium">Preview</p>
            <div className="rounded-xl bg-card border border-border/50 p-3 shadow-sm">
              <div className="flex items-center gap-2 mb-1">
                <div className="h-4 w-4 rounded bg-primary/20 flex items-center justify-center">
                  <Bell className="h-2.5 w-2.5 text-primary" />
                </div>
                <span className="text-[11px] font-semibold text-muted-foreground">Nevorai</span>
                <span className="text-[10px] text-muted-foreground ml-auto">now</span>
              </div>
              <p className="text-sm font-semibold">{title || 'Your notification title'}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{body || 'Your notification body text'}</p>
            </div>
          </div>
        )}

        {/* Send Button */}
        <Button
          onClick={() => setConfirmOpen(true)}
          disabled={sending || !title.trim() || !body.trim()}
          className="w-full h-10 rounded-xl font-semibold"
        >
          {sending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Megaphone className="h-4 w-4 mr-2" />}
          Send to {getAudienceLabel()} ({audienceCount.toLocaleString()})
        </Button>
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Send Push Notification?</AlertDialogTitle>
            <AlertDialogDescription>
              You're about to send a push notification to <strong>{audienceCount.toLocaleString()}</strong> users. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="rounded-xl bg-muted/50 border border-border/30 p-3 my-2">
            <p className="text-sm font-semibold">{title}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{body}</p>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleSend}>Send Now</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Recent Notifications */}
      <div className="space-y-2">
        <h3 className="text-sm font-bold font-heading">Recent Notifications</h3>
        {loadingHistory ? (
          <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : history.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No notifications sent yet</p>
        ) : (
          <div className="rounded-2xl border border-border/50 bg-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-[11px]">Title</TableHead>
                  <TableHead className="text-[11px]">Body</TableHead>
                  <TableHead className="text-[11px] w-16">Sent</TableHead>
                  <TableHead className="text-[11px] w-28">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map(n => (
                  <TableRow key={n.id}>
                    <TableCell className="py-2 px-3 text-sm font-medium max-w-[120px] truncate">{n.title}</TableCell>
                    <TableCell className="py-2 px-3 text-xs text-muted-foreground max-w-[180px] truncate">{n.body}</TableCell>
                    <TableCell className="py-2 px-3">
                      <Badge variant="secondary" className="text-[10px]">{n.recipient_count}</Badge>
                    </TableCell>
                    <TableCell className="py-2 px-3 text-[11px] text-muted-foreground whitespace-nowrap">
                      {format(new Date(n.created_at), 'MMM d, h:mm a')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
