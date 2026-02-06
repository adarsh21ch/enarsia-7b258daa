import { useState, useEffect } from 'react';
import { useAdminUsageLimits } from '@/hooks/useAdminConfig';
import { logAdminAction } from '@/hooks/useAuditLogs';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Save, RotateCcw, AlertTriangle, Users, Upload, Bell, Ban, Clock, Timer, Lock as LockIcon, CalendarDays, Flame } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { TrialBannerTabsManager } from './TrialBannerTabsManager';

const LIMIT_ICONS: Record<string, React.ReactNode> = {
  // Trial Period
  free_trial_days: <Clock className="h-4 w-4" />,
  trial_only_mode: <Timer className="h-4 w-4" />,
  // Lead Limits
  free_total_leads: <Users className="h-4 w-4" />,
  free_daily_upload: <Upload className="h-4 w-4" />,
  pro_daily_upload: <Upload className="h-4 w-4" />,
  // Warning Thresholds
  warning_threshold_1: <Bell className="h-4 w-4" />,
  warning_threshold_2: <Bell className="h-4 w-4" />,
  warning_threshold_3: <AlertTriangle className="h-4 w-4" />,
  // Hard Limits
  hard_limit: <Ban className="h-4 w-4" />,
  // Historical Access
  restrict_historical_data: <LockIcon className="h-4 w-4" />,
  allowed_past_days: <CalendarDays className="h-4 w-4" />,
  // Streak Settings
  streak_enabled: <Flame className="h-4 w-4" />,
  streak_grace_days: <Clock className="h-4 w-4" />,
};

const LIMIT_CATEGORIES = {
  'Trial Period': ['free_trial_days', 'trial_only_mode'],
  'Lead Limits': ['free_total_leads', 'free_daily_upload', 'pro_daily_upload'],
  'Warning Thresholds': ['warning_threshold_1', 'warning_threshold_2', 'warning_threshold_3'],
  'Hard Limits': ['hard_limit'],
  'Historical Access': ['restrict_historical_data', 'allowed_past_days'],
  'Streak Settings': ['streak_enabled', 'streak_grace_days'],
};

const BOOLEAN_FIELDS = ['trial_only_mode', 'restrict_historical_data', 'streak_enabled'];

export function UsageLimitsManager() {
  const { limits, loading, updateLimit } = useAdminUsageLimits();
  const [pendingChanges, setPendingChanges] = useState<Record<string, { value: number; enabled: boolean }>>({});
  const [saving, setSaving] = useState(false);

  const handleValueChange = (id: string, key: string, value: number, currentEnabled: boolean) => {
    setPendingChanges(prev => ({
      ...prev,
      [id]: { value, enabled: prev[id]?.enabled ?? currentEnabled },
    }));
  };

  const handleEnabledChange = (id: string, key: string, enabled: boolean, currentValue: number) => {
    setPendingChanges(prev => ({
      ...prev,
      [id]: { value: prev[id]?.value ?? currentValue, enabled },
    }));
  };

  const handleSaveAll = async () => {
    setSaving(true);
    try {
      for (const [id, changes] of Object.entries(pendingChanges)) {
        // Find the original limit to get old values
        const originalLimit = limits.find(l => l.id === id);
        const oldValue = originalLimit ? {
          config_key: originalLimit.config_key,
          config_value: originalLimit.config_value,
          is_enabled: originalLimit.is_enabled,
        } : null;
        
        await updateLimit(id, changes.value, changes.enabled);
        
        // Log audit action for each limit change
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
    } catch (err) {
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Usage Limits</h2>
          <p className="text-sm text-muted-foreground">Control free/pro limits and warning thresholds</p>
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

      {Object.entries(LIMIT_CATEGORIES).map(([category, keys]) => {
        const categoryLimits = limits.filter(l => keys.includes(l.config_key));
        if (categoryLimits.length === 0) return null;

        return (
          <div key={category} className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground">{category}</h3>
            <div className="grid gap-3">
              {categoryLimits.map((limit) => {
                const pending = pendingChanges[limit.id];
                const currentValue = pending?.value ?? limit.config_value;
                const currentEnabled = pending?.enabled ?? limit.is_enabled;
                const hasChange = !!pending;
                
                // Boolean-like fields don't need value input
                const isBooleanField = BOOLEAN_FIELDS.includes(limit.config_key);

                return (
                  <Card key={limit.id} className={`p-4 ${hasChange ? 'ring-2 ring-primary/50' : ''}`}>
                    <div className="flex items-center gap-4">
                      <div className="p-2 rounded-lg bg-muted">
                        {LIMIT_ICONS[limit.config_key] || <Users className="h-4 w-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{formatLimitKey(limit.config_key)}</span>
                          {!currentEnabled && (
                            <Badge variant="outline" className="text-xs bg-muted">
                              Disabled
                            </Badge>
                          )}
                          {isBooleanField && currentEnabled && (
                            <Badge variant="default" className="text-xs bg-primary/10 text-primary border-primary/30">
                              Active
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {limit.description || limit.config_key}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        {/* Hide value input for boolean fields */}
                        {!isBooleanField && (
                          <Input
                            type="number"
                            value={currentValue}
                            onChange={(e) => handleValueChange(
                              limit.id, 
                              limit.config_key, 
                              parseInt(e.target.value) || 0,
                              limit.is_enabled
                            )}
                            className="w-24 h-8 text-right"
                            min="0"
                          />
                        )}
                        <Switch
                          checked={currentEnabled}
                          onCheckedChange={(enabled) => handleEnabledChange(
                            limit.id,
                            limit.config_key,
                            enabled,
                            limit.config_value
                          )}
                          aria-label="Enable limit"
                        />
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Uncategorized limits */}
      {(() => {
        const categorizedKeys = Object.values(LIMIT_CATEGORIES).flat();
        const uncategorized = limits.filter(l => !categorizedKeys.includes(l.config_key));
        if (uncategorized.length === 0) return null;

        return (
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground">Other Limits</h3>
            <div className="grid gap-3">
              {uncategorized.map((limit) => {
                const pending = pendingChanges[limit.id];
                const currentValue = pending?.value ?? limit.config_value;
                const currentEnabled = pending?.enabled ?? limit.is_enabled;

                return (
                  <Card key={limit.id} className="p-4">
                    <div className="flex items-center gap-4">
                      <div className="flex-1 min-w-0">
                        <span className="font-medium">{formatLimitKey(limit.config_key)}</span>
                        <p className="text-xs text-muted-foreground">{limit.description}</p>
                      </div>
                      <Input
                        type="number"
                        value={currentValue}
                        onChange={(e) => handleValueChange(
                          limit.id,
                          limit.config_key,
                          parseInt(e.target.value) || 0,
                          limit.is_enabled
                        )}
                        className="w-24 h-8 text-right"
                        min="0"
                      />
                      <Switch
                        checked={currentEnabled}
                        onCheckedChange={(enabled) => handleEnabledChange(
                          limit.id,
                          limit.config_key,
                          enabled,
                          limit.config_value
                        )}
                      />
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* Historical Restriction Scope */}
      <HistoricalScopeManager />

      {/* Streak Actions Manager */}
      <StreakActionsManager />

      {/* Trial Banner Tab Visibility */}
      <TrialBannerTabsManager />
    </div>
  );
}

/** Manages the historical_restriction_scope checkboxes */
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
      <h3 className="text-sm font-medium text-muted-foreground">Historical Restriction Scope</h3>
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
        <p className="text-xs text-muted-foreground mt-2">
          Select which trackers enforce historical data restrictions for free users.
        </p>
      </Card>
    </div>
  );
}

/** Manages streak_active_actions checkboxes */
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
      <h3 className="text-sm font-medium text-muted-foreground">Streak Active Actions</h3>
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
        <p className="text-xs text-muted-foreground mt-2">
          Select which user actions count toward their daily activity streak.
        </p>
      </Card>
    </div>
  );
}

function formatLimitKey(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}
