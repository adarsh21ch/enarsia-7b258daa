import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Send, Loader2, Bell, Users } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

const TARGET_OPTIONS = [
  { value: 'all', label: 'All Users' },
  { value: 'free', label: 'Free Users' },
  { value: 'basic', label: 'Basic Users' },
  { value: 'pro', label: 'Pro Users' },
  { value: 'trial', label: 'Trial Users' },
  { value: 'expiring', label: 'Expiring Soon' },
];

export function AdminNotificationsPanel() {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [target, setTarget] = useState('all');
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
          <Select value={target} onValueChange={setTarget}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="Target Audience" />
            </SelectTrigger>
            <SelectContent>
              {TARGET_OPTIONS.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={handleSend} disabled={sending || !title.trim() || !body.trim()} className="w-full">
            {sending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
            Send to {TARGET_OPTIONS.find(o => o.value === target)?.label || 'All'} ({subCount})
          </Button>
        </CardContent>
      </Card>

      {/* History Table */}
      <div>
        <h3 className="text-sm font-semibold mb-2">Recent Notifications</h3>
        {loadingHistory ? (
          <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : history.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No notifications sent yet</p>
        ) : (
          <div className="rounded-lg border border-border/50 bg-card">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-[11px]">Title</TableHead>
                  <TableHead className="text-[11px]">Body</TableHead>
                  <TableHead className="text-[11px] w-16">Sent</TableHead>
                  <TableHead className="text-[11px] w-24">Date</TableHead>
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
