import { useState } from 'react';
import { useAdminUsageLimits } from '@/hooks/useAdminConfig';
import { logAdminAction } from '@/hooks/useAuditLogs';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Loader2, Save, RotateCcw, AlertTriangle, Users, Upload, Bell, Ban, Clock, Timer } from 'lucide-react';
import { toast } from 'sonner';

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
};

const LIMIT_CATEGORIES = {
  'Trial Period': ['free_trial_days', 'trial_only_mode'],
  'Lead Limits': ['free_total_leads', 'free_daily_upload', 'pro_daily_upload'],
  'Warning Thresholds': ['warning_threshold_1', 'warning_threshold_2', 'warning_threshold_3'],
  'Hard Limits': ['hard_limit'],
};

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
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {limit.description || limit.config_key}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
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
    </div>
  );
}

function formatLimitKey(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}
