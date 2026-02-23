import { useState } from 'react';
import { useAdminFeatureFlags } from '@/hooks/useAdminConfig';
import { logAdminAction } from '@/hooks/useAuditLogs';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, Sparkles, Users, Crown, Power, FlaskConical, Plus, Hash } from 'lucide-react';
import { toast } from 'sonner';

const CATEGORY_ORDER = ['calling', 'leads', 'tracking', 'todo', 'export', 'automation', 'analytics', 'team', 'ai', 'general'];
const CATEGORY_LABELS: Record<string, string> = {
  calling: '📞 Calling',
  leads: '📋 Leads',
  tracking: '📊 Tracking',
  todo: '✅ To-Do',
  export: '📤 Export',
  automation: '⚙️ Automation',
  analytics: '📈 Analytics',
  team: '👥 Team',
  ai: '🤖 AI',
  general: '🔧 General',
};

export function FeatureFlagsManager() {
  const { flags, loading, updateFlag, createFlag } = useAdminFeatureFlags();
  const [showAdd, setShowAdd] = useState(false);
  const [newKey, setNewKey] = useState('');
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState('general');

  const handleToggle = async (
    id: string,
    field: 'free_access' | 'pro_access' | 'trial_access' | 'is_enabled',
    value: boolean,
    flag: any
  ) => {
    try {
      const oldValue = { [field]: flag[field] };
      const newValue = { [field]: value };
      await updateFlag(id, newValue);
      await logAdminAction('feature_flag_updated', 'feature', id, oldValue, newValue, `Feature "${flag.feature_name}" - ${field} changed to ${value}`);
      toast.success('Feature flag updated');
    } catch (err) {
      toast.error('Failed to update feature flag');
    }
  };

  const handleFieldChange = async (id: string, field: string, value: string, flag: any) => {
    try {
      const oldValue = { [field]: flag[field] };
      const newValue = { [field]: value };
      // Auto-sync legacy columns when required_tier changes
      const updates: any = { [field]: value };
      if (field === 'required_tier') {
        updates.free_access = value === 'basic';
        updates.pro_access = value === 'basic' || value === 'pro';
      }
      await updateFlag(id, updates);
      await logAdminAction('feature_flag_updated', 'feature', id, oldValue, newValue, `Feature "${flag.feature_name}" - ${field} changed to ${value}`);
      toast.success('Feature updated');
    } catch (err) {
      toast.error('Failed to update feature');
    }
  };

  const handleLimitChange = async (id: string, field: 'free_limit' | 'pro_limit' | 'trial_limit', value: string, flag: any) => {
    const numVal = value === '' ? null : parseInt(value, 10);
    if (value !== '' && isNaN(numVal!)) return;
    try {
      const oldValue = { [field]: flag[field] };
      const newValue = { [field]: numVal };
      await updateFlag(id, newValue);
      await logAdminAction('feature_flag_updated', 'feature', id, oldValue, newValue, `Feature "${flag.feature_name}" - ${field} changed to ${numVal ?? 'unlimited'}`);
      toast.success('Limit updated');
    } catch (err) {
      toast.error('Failed to update limit');
    }
  };

  const handleAddFlag = async () => {
    if (!newKey.trim() || !newName.trim()) {
      toast.error('Key and name are required');
      return;
    }
    try {
      await createFlag({ feature_key: newKey.trim().toLowerCase(), feature_name: newName.trim(), category: newCategory });
      toast.success('Feature added');
      setNewKey('');
      setNewName('');
      setShowAdd(false);
    } catch (err) {
      toast.error('Failed to add feature');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Group flags by module first, then category
  const MODULE_ORDER = ['application', 'trackup', 'funnels'];
  const MODULE_LABELS: Record<string, { label: string; color: string }> = {
    application: { label: '📱 Application', color: 'border-primary/30 bg-primary/5' },
    trackup: { label: '📊 TrackUp', color: 'border-accent/30 bg-accent/5' },
    funnels: { label: '🎬 Funnels', color: 'border-secondary/30 bg-secondary/5' },
  };

  const groupedByModule = flags.reduce((acc: Record<string, Record<string, typeof flags>>, flag: any) => {
    const mod = flag.module || 'application';
    const cat = flag.category || 'general';
    if (!acc[mod]) acc[mod] = {};
    if (!acc[mod][cat]) acc[mod][cat] = [];
    acc[mod][cat].push(flag);
    return acc;
  }, {} as Record<string, Record<string, typeof flags>>);

  const sortedModules = MODULE_ORDER.filter(m => groupedByModule[m] && Object.keys(groupedByModule[m]).length > 0);
  Object.keys(groupedByModule).forEach(m => { if (!sortedModules.includes(m)) sortedModules.push(m); });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Feature Registry</h2>
          <p className="text-sm text-muted-foreground">Control feature access for Free, Pro, and Trial users</p>
        </div>
        <Button size="sm" variant="outline" onClick={() => setShowAdd(!showAdd)}>
          <Plus className="h-4 w-4 mr-1" /> Add Feature
        </Button>
      </div>

      {showAdd && (
        <Card className="p-4 space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <Input placeholder="feature_key" value={newKey} onChange={e => setNewKey(e.target.value)} />
            <Input placeholder="Feature Name" value={newName} onChange={e => setNewName(e.target.value)} />
            <select className="border rounded-md px-2 text-sm" value={newCategory} onChange={e => setNewCategory(e.target.value)}>
              {CATEGORY_ORDER.map(c => <option key={c} value={c}>{CATEGORY_LABELS[c] || c}</option>)}
            </select>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleAddFlag}>Add</Button>
            <Button size="sm" variant="ghost" onClick={() => setShowAdd(false)}>Cancel</Button>
          </div>
        </Card>
      )}

      {sortedModules.map(mod => {
        const moduleInfo = MODULE_LABELS[mod] || { label: mod, color: 'border-border bg-muted/5' };
        const categoriesInModule = groupedByModule[mod];
        const sortedCats = CATEGORY_ORDER.filter(c => categoriesInModule[c]?.length > 0);
        Object.keys(categoriesInModule).forEach(c => { if (!sortedCats.includes(c)) sortedCats.push(c); });

        return (
          <div key={mod} className={`rounded-lg border-2 ${moduleInfo.color} p-4 space-y-4`}>
            <h3 className="text-base font-bold tracking-wide">{moduleInfo.label}</h3>

            {sortedCats.map(category => (
              <div key={category} className="space-y-2">
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  {CATEGORY_LABELS[category] || category}
                </h4>
                <div className="grid gap-2">
                  {categoriesInModule[category].map((flag: any) => (
                    <Card key={flag.id} className={`p-3 ${!flag.is_enabled ? 'opacity-50' : ''}`}>
                      <div className="space-y-2">
                        {/* Header row */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm">{flag.feature_name}</span>
                          <Badge variant="outline" className="text-[10px] font-mono">{flag.feature_key}</Badge>
                          {!flag.is_enabled && <Badge variant="destructive" className="text-[10px]">Off</Badge>}
                        </div>
                        {flag.description && <p className="text-xs text-muted-foreground">{flag.description}</p>}

                        {/* Tier & Module row */}
                        <div className="flex flex-wrap items-center gap-3">
                          <div className="flex items-center gap-1.5">
                            <Power className="h-3 w-3 text-muted-foreground" />
                            <Switch checked={flag.is_enabled} onCheckedChange={v => handleToggle(flag.id, 'is_enabled', v, flag)} />
                          </div>
                          <div className="h-4 w-px bg-border" />
                          <div className={`flex items-center gap-1.5 ${!flag.is_enabled ? 'opacity-40 pointer-events-none' : ''}`}>
                            <Crown className="h-3 w-3 text-muted-foreground" />
                            <span className="text-[10px] text-muted-foreground">Tier:</span>
                            <select
                              value={flag.required_tier || 'basic'}
                              onChange={e => handleFieldChange(flag.id, 'required_tier', e.target.value, flag)}
                              className="h-6 text-[11px] border rounded px-1 bg-background"
                            >
                              <option value="basic">Free</option>
                              <option value="pro">Basic</option>
                              <option value="premium">Pro</option>
                            </select>
                          </div>
                          <div className="h-4 w-px bg-border" />
                          <div className={`flex items-center gap-1.5 ${!flag.is_enabled ? 'opacity-40 pointer-events-none' : ''}`}>
                            <Sparkles className="h-3 w-3 text-muted-foreground" />
                            <span className="text-[10px] text-muted-foreground">Module:</span>
                            <select
                              value={flag.module || 'application'}
                              onChange={e => handleFieldChange(flag.id, 'module', e.target.value, flag)}
                              className="h-6 text-[11px] border rounded px-1 bg-background"
                            >
                              <option value="application">Application</option>
                              <option value="trackup">TrackUp</option>
                              <option value="funnels">Funnels</option>
                            </select>
                          </div>
                        </div>

                        {/* Numeric limits row */}
                        {flag.is_enabled && (
                          <div className="flex flex-wrap items-center gap-3 pt-1 border-t border-border/50">
                            <Hash className="h-3 w-3 text-muted-foreground" />
                            <span className="text-[11px] text-muted-foreground">Limits:</span>
                            {(['free_limit', 'pro_limit', 'trial_limit'] as const).map(field => (
                              <div key={field} className="flex items-center gap-1">
                                <span className="text-[10px] text-muted-foreground capitalize">{field.replace('_limit', '')}</span>
                                <Input
                                  type="number"
                                  className="h-6 w-16 text-xs px-1"
                                  placeholder="∞"
                                  value={flag[field] ?? ''}
                                  onBlur={e => handleLimitChange(flag.id, field, e.target.value, flag)}
                                  onKeyDown={e => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                                  onChange={() => {}}
                                />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        );
      })}

      {flags.length === 0 && (
        <Card className="p-8 text-center">
          <Sparkles className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
          <p className="text-muted-foreground">No feature flags configured</p>
        </Card>
      )}
    </div>
  );
}
