import { useState, useEffect } from 'react';
import { useAdminUserOverrides } from '@/hooks/useAdminConfig';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Save, Trash2, Crown, Calendar, Upload, Users, Flame } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { logAdminAction } from '@/hooks/useAuditLogs';
import { useQueryClient } from '@tanstack/react-query';

interface UserOverrideDrawerProps {
  open: boolean;
  onClose: () => void;
  userId: string;
  userEmail: string;
  userName?: string;
}

export function UserOverrideDrawer({
  open,
  onClose,
  userId,
  userEmail,
  userName,
}: UserOverrideDrawerProps) {
  const { overrides, createOrUpdateOverride, deleteOverride, loading } = useAdminUserOverrides();
  const [saving, setSaving] = useState(false);
  const [resettingStreak, setResettingStreak] = useState(false);
  const queryClient = useQueryClient();

  // Find existing override for this user
  const existingOverride = overrides.find(o => o.user_id === userId);

  const [grantingFunnelsPro, setGrantingFunnelsPro] = useState(false);
  const [funnelsProGranted, setFunnelsProGranted] = useState(false);

  const [formData, setFormData] = useState({
    force_pro_access: false,
    custom_daily_limit: '',
    custom_total_limit: '',
    custom_expiry_date: '',
    notes: '',
  });

  // Check if user already has funnels pro
  useEffect(() => {
    if (!open) return;
    (async () => {
      const { data } = await supabase
        .from('user_funnel_subscriptions')
        .select('plan, is_admin_override')
        .eq('user_id', userId)
        .maybeSingle();
      setFunnelsProGranted(data?.plan === 'pro' || false);
    })();
  }, [userId, open]);

  // Reset form when user changes or override loads
  useEffect(() => {
    if (existingOverride) {
      setFormData({
        force_pro_access: existingOverride.force_pro_access || false,
        custom_daily_limit: existingOverride.custom_daily_limit?.toString() || '',
        custom_total_limit: existingOverride.custom_total_limit?.toString() || '',
        custom_expiry_date: existingOverride.custom_expiry_date || '',
        notes: existingOverride.notes || '',
      });
    } else {
      setFormData({
        force_pro_access: false,
        custom_daily_limit: '',
        custom_total_limit: '',
        custom_expiry_date: '',
        notes: '',
      });
    }
  }, [existingOverride, userId]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await createOrUpdateOverride(userId, {
        force_pro_access: formData.force_pro_access,
        custom_daily_limit: formData.custom_daily_limit ? parseInt(formData.custom_daily_limit) : null,
        custom_total_limit: formData.custom_total_limit ? parseInt(formData.custom_total_limit) : null,
        custom_expiry_date: formData.custom_expiry_date || null,
        notes: formData.notes || '',
      });
      toast.success('Override saved');
      onClose();
    } catch (err) {
      toast.error('Failed to save override');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!existingOverride) return;
    if (!confirm('Remove all overrides for this user?')) return;
    
    setSaving(true);
    try {
      await deleteOverride(userId);
      toast.success('Override removed');
      onClose();
    } catch (err) {
      toast.error('Failed to remove override');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>User Override</SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-6">
          {/* User Info */}
          <div className="p-3 rounded-lg bg-muted">
            <p className="font-medium">{userName || 'User'}</p>
            <p className="text-sm text-muted-foreground">{userEmail}</p>
          </div>

          {/* Force Pro Access */}
          <div className="flex items-center justify-between p-4 rounded-lg border">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Crown className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="font-medium">Force Pro Access</p>
                <p className="text-xs text-muted-foreground">Grant Pro without payment</p>
              </div>
            </div>
            <Switch
              checked={formData.force_pro_access}
              onCheckedChange={(value) => setFormData(prev => ({ ...prev, force_pro_access: value }))}
            />
          </div>

          {/* Custom Daily Limit */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Upload className="h-4 w-4 text-muted-foreground" />
              Custom Daily Upload Limit
            </Label>
            <Input
              type="number"
              placeholder="Leave empty for default"
              value={formData.custom_daily_limit}
              onChange={(e) => setFormData(prev => ({ ...prev, custom_daily_limit: e.target.value }))}
              min="0"
            />
            <p className="text-xs text-muted-foreground">Override the daily lead upload limit</p>
          </div>

          {/* Custom Total Limit */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              Custom Total Lead Limit
            </Label>
            <Input
              type="number"
              placeholder="Leave empty for default"
              value={formData.custom_total_limit}
              onChange={(e) => setFormData(prev => ({ ...prev, custom_total_limit: e.target.value }))}
              min="0"
            />
            <p className="text-xs text-muted-foreground">Override the total lifetime lead limit</p>
          </div>

          {/* Custom Expiry Date */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              Custom Plan Expiry Date
            </Label>
            <Input
              type="date"
              value={formData.custom_expiry_date}
              onChange={(e) => setFormData(prev => ({ ...prev, custom_expiry_date: e.target.value }))}
            />
            <p className="text-xs text-muted-foreground">Override the subscription expiry date</p>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Internal Notes</Label>
            <Textarea
              placeholder="Support case reference, reason for override, etc."
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              rows={3}
            />
          </div>

          {/* Grant Funnels Pro */}
          <div className="flex items-center justify-between p-4 rounded-lg border">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <Crown className="h-4 w-4 text-amber-500" />
              </div>
              <div>
                <p className="font-medium">Funnels Pro</p>
                <p className="text-xs text-muted-foreground">
                  {funnelsProGranted ? 'User has Funnels Pro access' : 'Grant Funnels Pro access'}
                </p>
              </div>
            </div>
            <Switch
              checked={funnelsProGranted}
              disabled={grantingFunnelsPro}
              onCheckedChange={async (checked) => {
                setGrantingFunnelsPro(true);
                try {
                  if (checked) {
                    const { data: existing } = await supabase
                      .from('user_funnel_subscriptions')
                      .select('id')
                      .eq('user_id', userId)
                      .maybeSingle();
                    if (existing) {
                      await supabase.from('user_funnel_subscriptions').update({
                        plan: 'pro', status: 'active', is_admin_override: true, updated_at: new Date().toISOString(),
                      }).eq('user_id', userId);
                    } else {
                      await supabase.from('user_funnel_subscriptions').insert({
                        user_id: userId, plan: 'pro', status: 'active', is_admin_override: true,
                      });
                    }
                    await logAdminAction('funnels_pro_granted', 'user', userId, null, { plan: 'pro' }, `Granted Funnels Pro to ${userEmail}`);
                    toast.success('Funnels Pro granted');
                  } else {
                    await supabase.from('user_funnel_subscriptions').update({
                      plan: 'free', status: 'inactive', is_admin_override: false, updated_at: new Date().toISOString(),
                    }).eq('user_id', userId);
                    await logAdminAction('funnels_pro_revoked', 'user', userId, { plan: 'pro' }, { plan: 'free' }, `Revoked Funnels Pro from ${userEmail}`);
                    toast.success('Funnels Pro revoked');
                  }
                  setFunnelsProGranted(checked);
                } catch (err) {
                  toast.error('Failed to update Funnels Pro');
                } finally {
                  setGrantingFunnelsPro(false);
                }
              }}
            />
          </div>

          {/* Reset Streak */}
          <div className="flex items-center justify-between p-4 rounded-lg border">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-500/10">
                <Flame className="h-4 w-4 text-orange-500" />
              </div>
              <div>
                <p className="font-medium">Reset Streak</p>
                <p className="text-xs text-muted-foreground">Reset this user's activity streak to 0</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled={resettingStreak}
              onClick={async () => {
                if (!confirm('Reset this user\'s streak to 0?')) return;
                setResettingStreak(true);
                try {
                  await supabase
                    .from('user_streaks' as any)
                    .update({ current_streak: 0, grace_used: 0, last_active_date: null, updated_at: new Date().toISOString() })
                    .eq('user_id', userId);
                  await logAdminAction('streak_reset', 'user', userId, null, null, `Reset streak for ${userEmail}`);
                  queryClient.invalidateQueries({ queryKey: ['user-streak', userId] });
                  toast.success('Streak reset');
                } catch {
                  toast.error('Failed to reset streak');
                } finally {
                  setResettingStreak(false);
                }
              }}
            >
              {resettingStreak ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Reset'}
            </Button>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-4">
            <Button onClick={handleSave} disabled={saving} className="flex-1">
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Save Override
            </Button>
            {existingOverride && (
              <Button variant="destructive" onClick={handleDelete} disabled={saving}>
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
