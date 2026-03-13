import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Send, Loader2, Bell, Users } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

export function AdminNotificationsPanel() {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [subCount, setSubCount] = useState(0);
  const [loadingHistory, setLoadingHistory] = useState(true);

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

  const handleSend = async () => {
    if (!title.trim() || !body.trim()) {
      toast.error('Please fill in both title and body');
      return;
    }
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-push-notification', {
        body: { title: title.trim(), body: body.trim() },
      });
      if (error) throw error;
      toast.success(`Notification sent to ${data?.sent || 0} subscribers`);
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

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="flex gap-3">
        <Card className="flex-1">
          <CardContent className="pt-4 pb-3 px-4 flex items-center gap-3">
            <Users className="h-5 w-5 text-primary" />
            <div>
              <p className="text-2xl font-bold">{subCount}</p>
              <p className="text-[11px] text-muted-foreground">Active Subscribers</p>
            </div>
          </CardContent>
        </Card>
        <Card className="flex-1">
          <CardContent className="pt-4 pb-3 px-4 flex items-center gap-3">
            <Bell className="h-5 w-5 text-primary" />
            <div>
              <p className="text-2xl font-bold">{history.length}</p>
              <p className="text-[11px] text-muted-foreground">Notifications Sent</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Send Form */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Send Push Notification</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            placeholder="Notification title"
            value={title}
            onChange={e => setTitle(e.target.value)}
            maxLength={100}
          />
          <Textarea
            placeholder="Notification body"
            value={body}
            onChange={e => setBody(e.target.value)}
            rows={3}
            maxLength={300}
          />
          <Button onClick={handleSend} disabled={sending || !title.trim() || !body.trim()} className="w-full">
            {sending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
            Send to All ({subCount})
          </Button>
        </CardContent>
      </Card>

      {/* History */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Recent Notifications</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingHistory ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : history.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No notifications sent yet</p>
          ) : (
            <div className="space-y-2">
              {history.map(n => (
                <div key={n.id} className="rounded-lg border border-border/50 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{n.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.body}</p>
                    </div>
                    <Badge variant="secondary" className="text-[10px] shrink-0">
                      {n.recipient_count} sent
                    </Badge>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1.5">
                    {format(new Date(n.created_at), 'MMM d, h:mm a')}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
