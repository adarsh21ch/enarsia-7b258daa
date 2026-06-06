import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Bell, Clock, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useAIInsights } from '@/hooks/useAIInsights';

const HOURS = Array.from({ length: 24 }, (_, i) => ({
  value: i,
  label: `${i === 0 ? '12' : i > 12 ? i - 12 : i}:00 ${i < 12 ? 'AM' : 'PM'}`,
}));

interface AppNotificationsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isAdmin: boolean;
}

function Row({ label, description, checked, onChange, disabled }: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-2">
      <div className="min-w-0 flex-1 mr-3">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-[11px] text-muted-foreground">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} disabled={disabled} />
    </div>
  );
}

export function AppNotificationsSheet({ open, onOpenChange, isAdmin }: AppNotificationsSheetProps) {
  const { isSupported, isSubscribed, loading, subscribe, unsubscribe, sendTestPush } = usePushNotifications();
  const { preferences, prefsLoading, updatePreferences } = useAIInsights();
  const [toggling, setToggling] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);

  const prefs = preferences || { daily_snapshot: true, ai_alerts: true, coaching_insights: true, weekly_team_summary: true, snapshot_hour: 20 };

  const togglePref = (key: 'daily_snapshot' | 'ai_alerts' | 'coaching_insights' | 'weekly_team_summary', value: boolean) => {
    updatePreferences.mutate({ [key]: value });
  };

  const handleMaster = async (checked: boolean) => {
    setToggling(true);
    if (checked) {
      const result = await subscribe();
      if (result.ok) toast.success('Notifications enabled');
      else if (result.reason === 'permission_blocked') toast.error('Notifications are blocked in browser settings.');
      else if (result.reason === 'permission_denied') toast.error('Please allow notification permission.');
      else toast.error('Could not enable notifications.');
    } else {
      await unsubscribe();
      toast.success('Notifications disabled');
    }
    setToggling(false);
  };

  const handleSendTest = async () => {
    setSendingTest(true);
    const result = await sendTestPush();
    if (result.ok && result.sent > 0) toast.success('Test push sent.');
    else if (result.ok) toast.error('No active subscription on this device.');
    else toast.error('Failed to send test push.');
    setSendingTest(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] flex flex-col p-0 rounded-t-2xl">
        <SheetHeader className="px-4 pt-4 pb-2 border-b border-border/50">
          <SheetTitle className="flex items-center gap-2 text-base">
            <Bell className="h-4 w-4 text-primary" />
            App Notifications
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
          {/* Master */}
          {isSupported ? (
            <div className="rounded-xl border border-border/50 bg-card px-3 py-2.5">
              <Row
                label="Push Notifications"
                description={isSubscribed ? 'On — you will receive alerts on this device' : 'Get notified of updates & insights'}
                checked={isSubscribed}
                onChange={handleMaster}
                disabled={loading || toggling}
              />
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Push notifications are not supported on this device.</p>
          )}

          {/* Alert preferences (AI Insights) */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-foreground">Alert Preferences</h3>
            {prefsLoading ? (
              <div className="flex items-center justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
            ) : (
              <div className="rounded-xl border border-border/50 bg-card px-3 divide-y divide-border/40">
                <Row label="Daily Snapshot" description="Daily summary of your numbers" checked={prefs.daily_snapshot} onChange={(v) => togglePref('daily_snapshot', v)} />
                <Row label="AI Alerts" description="Team gaps, stuck prospects, activity drops" checked={prefs.ai_alerts} onChange={(v) => togglePref('ai_alerts', v)} />
                <Row label="Coaching Insights" description="Weekly tips to improve your activity" checked={prefs.coaching_insights} onChange={(v) => togglePref('coaching_insights', v)} />
                <Row label="Team Summary" description="Weekly team performance (leaders only)" checked={prefs.weekly_team_summary} onChange={(v) => togglePref('weekly_team_summary', v)} />
                <div className="flex items-center justify-between py-2.5">
                  <div className="flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-sm">Notification Time (IST)</span>
                  </div>
                  <Select value={String(prefs.snapshot_hour)} onValueChange={(v) => updatePreferences.mutate({ snapshot_hour: parseInt(v) })}>
                    <SelectTrigger className="w-28 h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {HOURS.map(h => (<SelectItem key={h.value} value={String(h.value)}>{h.label}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>

          {/* Admin only test */}
          {isAdmin && isSupported && (
            <div className="space-y-2">
              <h3 className="text-[11px] uppercase tracking-[1.2px] text-muted-foreground font-semibold">Admin</h3>
              <Button variant="outline" size="sm" className="w-full" onClick={handleSendTest} disabled={!isSubscribed || sendingTest || loading}>
                {sendingTest ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Bell className="h-4 w-4 mr-2" />}
                Send Test Push to This Device
              </Button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
