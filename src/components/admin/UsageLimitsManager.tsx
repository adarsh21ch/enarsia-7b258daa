import { useState, useEffect } from 'react';
import { useAdminUsageLimits } from '@/hooks/useAdminConfig';
import { logAdminAction } from '@/hooks/useAuditLogs';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Save, RotateCcw, AlertTriangle, Users, Upload, Bell, Ban, Clock, Timer, Lock as LockIcon, CalendarDays, Flame, Info, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { TrialBannerTabsManager } from './TrialBannerTabsManager';
import { LimitSettingCard, type LimitSettingMeta } from './LimitSettingCard';

// ─── Setting metadata: titles, scopes, toggle semantics ────────────────────

const SETTING_META: Record<string, LimitSettingMeta> = {
  // ── FREE USER LIMITS ──
  free_daily_upload: {
    title: 'Free Daily Upload Limit',
    scope: 'FREE',
    kind: 'LIMIT',
    onEnabled: 'Free users are restricted to X uploads per day',
    onDisabled: 'Free users have NO daily upload restriction',
    tooltip: 'This setting applies only to Free users. Turning this ON restricts daily uploads to the specified number. Pro users are not affected.',
    valueHint: '0 = no uploads allowed, 100 = max 100/day',
  },
  free_total_leads: {
    title: 'Free Total Leads (Lifetime)',
    scope: 'FREE',
    kind: 'LIMIT',
    onEnabled: 'Free users are restricted to X total leads (lifetime)',
    onDisabled: 'Free users have NO lifetime lead restriction',
    tooltip: 'This setting applies only to Free users. It caps the total number of leads a Free user can ever create. Pro users are not affected.',
    valueHint: '0 = blocked, higher = more generous cap',
  },
  restrict_historical_data: {
    title: 'Limit Free Users\' Historical Data Access',
    scope: 'FREE',
    kind: 'FEATURE',
    isBoolean: true,
    onEnabled: 'Free users can only view recent data (based on Allowed Past Days below)',
    onDisabled: 'Free users can view ALL historical data',
    tooltip: 'This setting applies only to Free users. When ON, past date data in TrackUp is locked behind an upgrade wall. Pro and Trial users always have full access.',
  },
  allowed_past_days: {
    title: 'Free Users: Allowed Past Data Days',
    scope: 'FREE',
    kind: 'LIMIT',
    onEnabled: 'Free users can view the last X days of data',
    onDisabled: 'Historical restriction is inactive (all data visible)',
    tooltip: 'This setting applies only to Free users. Controls how many days back a Free user can see in TrackUp. Only works when "Limit Historical Data Access" is ON.',
    valueHint: '0 = today only, 7 = last 7 days, 30 = last 30 days',
  },

  // ── PRO USER OVERRIDES ──
  pro_daily_upload: {
    title: 'Pro Daily Upload Limit',
    scope: 'PRO',
    kind: 'LIMIT',
    onEnabled: 'Pro users are restricted to X uploads per day',
    onDisabled: 'Pro users have UNLIMITED daily uploads',
    tooltip: 'This setting applies only to Pro users. Usually kept OFF (unlimited). Turn ON only if you want to cap Pro uploads.',
    valueHint: '0 = unlimited (when disabled)',
  },

  // ── TRIAL CONFIGURATION ──
  free_trial_days: {
    title: 'Trial Duration (Days)',
    scope: 'TRIAL',
    kind: 'LIMIT',
    onEnabled: 'New users get X days of trial access',
    onDisabled: 'Free trial is completely disabled for new users',
    tooltip: 'Controls how many days new users get trial access. When disabled, no trial is offered.',
    valueHint: 'e.g. 7 = one week trial',
  },
  trial_only_mode: {
    title: 'Trial Overrides Free Limits',
    scope: 'TRIAL',
    kind: 'FEATURE',
    isBoolean: true,
    onEnabled: 'Trial users IGNORE Free limits and get Pro-level access',
    onDisabled: 'Trial users follow Free plan limits',
    tooltip: 'When ON, active trial users bypass all Free-tier restrictions and behave as Pro users. When OFF, trial users are treated the same as Free users.',
  },

  // ── WARNING & PAYWALL ──
  warning_threshold_1: {
    title: 'Warning Stage 1 (Soft Warning)',
    scope: 'FREE',
    kind: 'LIMIT',
    onEnabled: 'Soft warning shown when Free user reaches X% of their limit',
    onDisabled: 'No soft warning is shown',
    tooltip: 'Triggers a gentle upgrade nudge when a Free user reaches this percentage of their lead limit. Pro users never see this.',
    valueHint: 'e.g. 70 = warn at 70% usage',
  },
  warning_threshold_2: {
    title: 'Warning Stage 2 (Strong Warning)',
    scope: 'FREE',
    kind: 'LIMIT',
    onEnabled: 'Strong warning shown when Free user reaches X% of their limit',
    onDisabled: 'No strong warning is shown',
    tooltip: 'Triggers an urgent upgrade banner when a Free user reaches this percentage. More prominent than Stage 1.',
    valueHint: 'e.g. 90 = warn at 90% usage',
  },
  warning_threshold_3: {
    title: 'Warning Stage 3 (Critical Alert)',
    scope: 'FREE',
    kind: 'LIMIT',
    onEnabled: 'Critical alert shown when Free user reaches X% of their limit',
    onDisabled: 'No critical alert is shown',
    tooltip: 'Triggers a blocking-style alert when a Free user is at or very close to their limit.',
    valueHint: 'e.g. 95 = alert at 95% usage',
  },
  hard_limit: {
    title: 'Hard Limit (Blocking Paywall)',
    scope: 'FREE',
    kind: 'LIMIT',
    onEnabled: 'Free users are BLOCKED when they reach X% of their limit',
    onDisabled: 'No hard block — Free users can exceed limits',
    tooltip: 'When ON, Free users hitting this threshold see a blocking modal and cannot add more leads until they upgrade. Pro users are never blocked.',
    valueHint: 'e.g. 100 = block at 100% (exact limit)',
  },

  // ── STREAK SETTINGS ──
  streak_enabled: {
    title: 'Activity Streak Tracking',
    scope: 'ALL',
    kind: 'FEATURE',
    isBoolean: true,
    onEnabled: 'Users see their daily activity streak counter',
    onDisabled: 'Streak tracking is hidden for all users',
    tooltip: 'Applies to all users. Shows a streak counter that tracks consecutive days of activity.',
  },
  streak_grace_days: {
    title: 'Streak Grace Period',
    scope: 'ALL',
    kind: 'LIMIT',
    onEnabled: 'Users get X grace days before losing their streak',
    onDisabled: 'No grace period — streak resets after 1 missed day',
    tooltip: 'Applies to all users. Allows users to miss X days before their streak resets to zero.',
    valueHint: '0 = no grace, 1 = can miss 1 day',
  },
};

const SETTING_ICONS: Record<string, React.ReactNode> = {
  free_trial_days: <Clock className="h-4 w-4" />,
  trial_only_mode: <Timer className="h-4 w-4" />,
  free_total_leads: <Users className="h-4 w-4" />,
  free_daily_upload: <Upload className="h-4 w-4" />,
  pro_daily_upload: <Upload className="h-4 w-4" />,
  warning_threshold_1: <Bell className="h-4 w-4" />,
  warning_threshold_2: <Bell className="h-4 w-4" />,
  warning_threshold_3: <AlertTriangle className="h-4 w-4" />,
  hard_limit: <Ban className="h-4 w-4" />,
  restrict_historical_data: <LockIcon className="h-4 w-4" />,
  allowed_past_days: <CalendarDays className="h-4 w-4" />,
  streak_enabled: <Flame className="h-4 w-4" />,
  streak_grace_days: <Clock className="h-4 w-4" />,
};

// ─── Regrouped sections per the design spec ─────────────────────────────────

const SECTIONS = [
  {
    title: '🔒 Free User Limits',
    subtitle: 'Restrictions that apply ONLY to Free users. Pro users bypass all of these.',
    keys: ['free_daily_upload', 'free_total_leads', 'restrict_historical_data', 'allowed_past_days'],
  },
  {
    title: '👑 Pro User Overrides',
    subtitle: 'Settings that apply ONLY to Pro users. Usually kept unlimited.',
    keys: ['pro_daily_upload'],
  },
  {
    title: '⏳ Trial Configuration',
    subtitle: 'Controls how the free trial works for new sign-ups.',
    keys: ['free_trial_days', 'trial_only_mode'],
  },
  {
    title: '⚠️ Warning & Paywall Stages',
    subtitle: 'Progressive warnings shown to Free users as they approach their limit.',
    keys: ['warning_threshold_1', 'warning_threshold_2', 'warning_threshold_3', 'hard_limit'],
  },
  {
    title: '🔥 Streak Settings',
    subtitle: 'Activity streak tracking settings for all users.',
    keys: ['streak_enabled', 'streak_grace_days'],
  },
];

// ─── Main component ─────────────────────────────────────────────────────────

export function UsageLimitsManager() {
  const { limits, loading, updateLimit } = useAdminUsageLimits();
  const [pendingChanges, setPendingChanges] = useState<Record<string, { value: number; enabled: boolean }>>({});
  const [saving, setSaving] = useState(false);

  const handleValueChange = (id: string, value: number, currentEnabled: boolean) => {
    setPendingChanges(prev => ({
      ...prev,
      [id]: { value, enabled: prev[id]?.enabled ?? currentEnabled },
    }));
  };

  const handleEnabledChange = (id: string, enabled: boolean, currentValue: number) => {
    setPendingChanges(prev => ({
      ...prev,
      [id]: { value: prev[id]?.value ?? currentValue, enabled },
    }));
  };

  const handleSaveAll = async () => {
    setSaving(true);
    try {
      for (const [id, changes] of Object.entries(pendingChanges)) {
        const originalLimit = limits.find(l => l.id === id);
        const oldValue = originalLimit ? {
          config_key: originalLimit.config_key,
          config_value: originalLimit.config_value,
          is_enabled: originalLimit.is_enabled,
        } : null;

        await updateLimit(id, changes.value, changes.enabled);

        if (originalLimit) {
          await logAdminAction(
            'limit_updated',
            'limit',
            id,
            oldValue,
            { config_key: originalLimit.config_key, config_value: changes.value, is_enabled: changes.enabled },
            `Updated limit "${originalLimit.config_key}" from ${originalLimit.config_value} to ${changes.value}`
          );
        }
      }
      setPendingChanges({});
      toast.success('All limits saved');
    } catch {
      toast.error('Failed to save limits');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setPendingChanges({});
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const hasChanges = Object.keys(pendingChanges).length > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Limits & Access Control</h2>
          <p className="text-sm text-muted-foreground">Configure restrictions, limits, and paywall behavior</p>
        </div>
        {hasChanges && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleReset}>
              <RotateCcw className="h-4 w-4 mr-1" />
              Reset
            </Button>
            <Button size="sm" onClick={handleSaveAll} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
              Save All
            </Button>
          </div>
        )}
      </div>

      {/* ─── Global Rules Info Box ─── */}
      <Card className="p-4 bg-muted/50 border-primary/20">
        <div className="flex items-start gap-3">
          <ShieldCheck className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm font-semibold">Global Rules</p>
            <ul className="text-xs text-muted-foreground space-y-0.5">
              <li>• <strong>Free users</strong> are affected by all limits below</li>
              <li>• <strong>Pro users</strong> bypass Free limits (unless Pro-specific limit is set)</li>
              <li>• <strong>Trial users</strong> follow Trial configuration (Pro access or Free limits)</li>
              <li>• <strong>ENABLED (ON)</strong> = restriction is <strong>active</strong></li>
              <li>• <strong>DISABLED (OFF)</strong> = restriction is <strong>inactive</strong></li>
            </ul>
          </div>
        </div>
      </Card>

      {/* ─── Sections ─── */}
      {SECTIONS.map(section => {
        const sectionLimits = section.keys
          .map(key => limits.find(l => l.config_key === key))
          .filter(Boolean) as typeof limits;

        if (sectionLimits.length === 0) return null;

        return (
          <div key={section.title} className="space-y-3">
            <div>
              <h3 className="text-sm font-semibold">{section.title}</h3>
              <p className="text-[11px] text-muted-foreground">{section.subtitle}</p>
            </div>
            <div className="grid gap-3">
              {sectionLimits.map(limit => {
                const meta = SETTING_META[limit.config_key];
                if (!meta) return null;

                const pending = pendingChanges[limit.id];
                const currentValue = pending?.value ?? limit.config_value;
                const currentEnabled = pending?.enabled ?? limit.is_enabled;
                const hasChange = !!pending;

                return (
                  <LimitSettingCard
                    key={limit.id}
                    meta={meta}
                    currentValue={currentValue}
                    currentEnabled={currentEnabled}
                    hasChange={hasChange}
                    onValueChange={(v) => handleValueChange(limit.id, v, limit.is_enabled)}
                    onEnabledChange={(e) => handleEnabledChange(limit.id, e, limit.config_value)}
                    icon={SETTING_ICONS[limit.config_key] || <Users className="h-4 w-4" />}
                  />
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Uncategorized limits (safety net) */}
      {(() => {
        const allKeys = SECTIONS.flatMap(s => s.keys);
        const uncategorized = limits.filter(l => !allKeys.includes(l.config_key));
        if (uncategorized.length === 0) return null;

        return (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">🔧 Other Settings</h3>
            <div className="grid gap-3">
              {uncategorized.map(limit => {
                const pending = pendingChanges[limit.id];
                const currentValue = pending?.value ?? limit.config_value;
                const currentEnabled = pending?.enabled ?? limit.is_enabled;

                const fallbackMeta: LimitSettingMeta = {
                  title: limit.config_key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
                  scope: 'ALL',
                  kind: 'LIMIT',
                  onEnabled: 'This restriction is active',
                  onDisabled: 'This restriction is inactive',
                  tooltip: limit.description || 'No additional information available.',
                };

                return (
                  <LimitSettingCard
                    key={limit.id}
                    meta={fallbackMeta}
                    currentValue={currentValue}
                    currentEnabled={currentEnabled}
                    hasChange={!!pending}
                    onValueChange={(v) => handleValueChange(limit.id, v, limit.is_enabled)}
                    onEnabledChange={(e) => handleEnabledChange(limit.id, e, limit.config_value)}
                    icon={<Users className="h-4 w-4" />}
                  />
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* ─── Sub-managers ─── */}
      <HistoricalScopeManager />
      <StreakActionsManager />
      <TrialBannerTabsManager />
    </div>
  );
}

// ─── Historical Restriction Scope ──────────────────────────────────────────

function HistoricalScopeManager() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['admin-historical-scope'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_config_text')
        .select('*')
        .eq('config_key', 'historical_restriction_scope')
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const currentScopes = (data?.config_value || 'leads,funnel').split(',').map((s: string) => s.trim().toLowerCase());
  const [leadsChecked, setLeadsChecked] = useState(true);
  const [funnelChecked, setFunnelChecked] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data) {
      const scopes = data.config_value.split(',').map((s: string) => s.trim().toLowerCase());
      setLeadsChecked(scopes.includes('leads'));
      setFunnelChecked(scopes.includes('funnel'));
    }
  }, [data]);

  const handleSave = async () => {
    const scopes: string[] = [];
    if (leadsChecked) scopes.push('leads');
    if (funnelChecked) scopes.push('funnel');
    const newValue = scopes.join(',') || 'none';

    setSaving(true);
    try {
      const { error } = await supabase
        .from('admin_config_text')
        .update({ config_value: newValue })
        .eq('config_key', 'historical_restriction_scope');
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['admin-historical-scope'] });
      queryClient.invalidateQueries({ queryKey: ['historical-restriction-scope'] });
      queryClient.invalidateQueries({ queryKey: ['admin-config'] });
      toast.success('Scope updated');
    } catch {
      toast.error('Failed to update scope');
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = data && (
    leadsChecked !== currentScopes.includes('leads') ||
    funnelChecked !== currentScopes.includes('funnel')
  );

  if (isLoading) return null;

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold">🔒 Historical Restriction Scope</h3>
        <p className="text-[11px] text-muted-foreground">Applies to: FREE users — Select which trackers enforce historical data restrictions</p>
      </div>
      <Card className="p-4">
        <div className="flex items-center gap-6">
          <label className="flex items-center gap-2 cursor-pointer">
            <Checkbox checked={leadsChecked} onCheckedChange={(v) => setLeadsChecked(!!v)} />
            <span className="text-sm font-medium">Leads Tracking</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <Checkbox checked={funnelChecked} onCheckedChange={(v) => setFunnelChecked(!!v)} />
            <span className="text-sm font-medium">Funnel Tracking</span>
          </label>
          {hasChanges && (
            <Button size="sm" onClick={handleSave} disabled={saving} className="ml-auto">
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
              Save
            </Button>
          )}
        </div>
        <p className="text-[11px] text-muted-foreground mt-2">
          ✅ Checked = Free users' historical data is restricted in that tracker. Pro users always have full access.
        </p>
      </Card>
    </div>
  );
}

// ─── Streak Active Actions ──────────────────────────────────────────────────

function StreakActionsManager() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['admin-streak-actions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_config_text')
        .select('*')
        .eq('config_key', 'streak_active_actions')
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const ALL_ACTIONS = [
    { key: 'manual_add', label: 'Manual Add' },
    { key: 'import', label: 'Import' },
    { key: 'call', label: 'Call' },
    { key: 'tracking_update', label: 'Tracking Update' },
  ];

  const currentActions = (data?.config_value || 'manual_add,import,call,tracking_update').split(',').map((s: string) => s.trim());
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data) {
      const actions = data.config_value.split(',').map((s: string) => s.trim());
      const state: Record<string, boolean> = {};
      ALL_ACTIONS.forEach(a => { state[a.key] = actions.includes(a.key); });
      setChecked(state);
    }
  }, [data]);

  const handleSave = async () => {
    const selected = ALL_ACTIONS.filter(a => checked[a.key]).map(a => a.key);
    const newValue = selected.join(',') || 'none';

    setSaving(true);
    try {
      const { error } = await supabase
        .from('admin_config_text')
        .update({ config_value: newValue })
        .eq('config_key', 'streak_active_actions');
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['admin-streak-actions'] });
      queryClient.invalidateQueries({ queryKey: ['streak-active-actions'] });
      queryClient.invalidateQueries({ queryKey: ['admin-config'] });
      toast.success('Streak actions updated');
    } catch {
      toast.error('Failed to update streak actions');
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = data && ALL_ACTIONS.some(a => (checked[a.key] ?? false) !== currentActions.includes(a.key));

  if (isLoading) return null;

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold">🔥 Streak Active Actions</h3>
        <p className="text-[11px] text-muted-foreground">Applies to: ALL users — Select which actions count toward daily streak</p>
      </div>
      <Card className="p-4">
        <div className="flex items-center gap-6 flex-wrap">
          {ALL_ACTIONS.map(action => (
            <label key={action.key} className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={checked[action.key] ?? false}
                onCheckedChange={(v) => setChecked(prev => ({ ...prev, [action.key]: !!v }))}
              />
              <span className="text-sm font-medium">{action.label}</span>
            </label>
          ))}
          {hasChanges && (
            <Button size="sm" onClick={handleSave} disabled={saving} className="ml-auto">
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
              Save
            </Button>
          )}
        </div>
        <p className="text-[11px] text-muted-foreground mt-2">
          ✅ Checked = This action counts as "active" for streak tracking.
        </p>
      </Card>
    </div>
  );
}
