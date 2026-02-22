import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Users, ChevronDown, Check, Loader2, X, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Profile } from '@/hooks/useProfile';
import { useTrackingFormatContext } from '@/contexts/TrackingFormatContext';
import { useFunnelConfig } from '@/hooks/useFunnelConfig';
import { supabase } from '@/integrations/supabase/client';

interface ConnectUplineCardProps {
  profile: Profile | null;
  updating: boolean;
  onUpdateProfile: (updates: any) => Promise<{ error: any }>;
  onUpdateUplineByEmail: (email: string) => Promise<{ success: boolean; error?: string }>;
  onClearLeaderHierarchy: () => Promise<{ success: boolean; error?: string }>;
}

export function ConnectUplineCard({
  profile,
  updating,
  onUpdateProfile,
  onUpdateUplineByEmail,
  onClearLeaderHierarchy,
}: ConnectUplineCardProps) {
  const [emailInput, setEmailInput] = useState('');
  const [saving, setSaving] = useState(false);
  const { refreshFormat, directLeaderName } = useTrackingFormatContext();
  const { refetchLeaderConnection } = useFunnelConfig();

  const isConnected = !!profile?.upline_email;

  const handleConnect = async () => {
    if (!emailInput.trim()) return;
    setSaving(true);
    const result = await onUpdateUplineByEmail(emailInput.trim().toLowerCase());
    if (result.success) {
      // Clear old custom_options when connecting to upline
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('custom_options')
          .delete()
          .eq('user_id', user.id)
          .in('option_type', ['action_taken', 'funnel_stage']);
      }
      setEmailInput('');
      await onUpdateProfile({ use_leader_stages: true });
      await refetchLeaderConnection();
      refreshFormat();
      toast.success('Connected to upline successfully');
    } else {
      toast.error(result.error || 'Failed to connect');
    }
    setSaving(false);
  };

  const handleDisconnect = async () => {
    await onClearLeaderHierarchy();
    await onUpdateProfile({ use_leader_stages: false });
    await refetchLeaderConnection();
    refreshFormat();
  };

  const handleSync = async () => {
    if (!profile?.upline_email) return;
    setSaving(true);
    const result = await onUpdateUplineByEmail(profile.upline_email);
    if (result.success) {
      await refetchLeaderConnection();
      refreshFormat();
      toast.success('Upline data synced!');
    } else {
      toast.error(result.error || 'Failed to sync');
    }
    setSaving(false);
  };

  const uplineDisplayName = directLeaderName || 
    (profile?.upline_email 
      ? profile.upline_email.split('@')[0].charAt(0).toUpperCase() + profile.upline_email.split('@')[0].slice(1) 
      : '');

  return (
    <Collapsible className="rounded-xl bg-card border border-border/50 overflow-hidden">
      <CollapsibleTrigger className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-muted/50 transition-colors">
        <div className="flex items-center gap-2.5">
          <Users className="h-4 w-4 text-primary" />
          <span className="font-medium text-sm">Connect to Upline</span>
          {isConnected && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
              <Check className="h-2.5 w-2.5" />
              Connected
            </span>
          )}
        </div>
        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground transition-transform [[data-state=open]>&]:rotate-180" />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="px-4 pb-3 space-y-3">
          {isConnected ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between p-2.5 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                <div>
                  <p className="text-[11px] text-muted-foreground">Connected to</p>
                  <p className="font-semibold text-sm text-emerald-600 dark:text-emerald-400">
                    {uplineDisplayName}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={handleSync}
                    disabled={updating || saving}
                  >
                    {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                    <span className="ml-1">Sync</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs text-destructive hover:text-destructive"
                    onClick={handleDisconnect}
                    disabled={updating}
                  >
                    <X className="h-3.5 w-3.5 mr-1" />
                    Disconnect
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-[11px] text-muted-foreground">
                Enter your upline's email to use their tracking format.
              </p>
              <div className="flex gap-2">
                <Input
                  placeholder="upline@gmail.com"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  className="h-8 text-sm"
                  onKeyDown={(e) => e.key === 'Enter' && handleConnect()}
                />
                <Button
                  size="sm"
                  className="h-8 px-3"
                  onClick={handleConnect}
                  disabled={saving || !emailInput.trim()}
                >
                  {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Connect'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
