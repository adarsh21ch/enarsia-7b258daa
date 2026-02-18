import { useState } from 'react';
import { useAdminFeatureFlags } from '@/hooks/useAdminConfig';
import { logAdminAction } from '@/hooks/useAuditLogs';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, Users, Crown, Power, FlaskConical, Plus, Hash } from 'lucide-react';
import { toast } from 'sonner';

export function FunnelsFeaturesControl() {
  const { flags, loading, updateFlag, createFlag } = useAdminFeatureFlags();
  const [showAdd, setShowAdd] = useState(false);
  const [newKey, setNewKey] = useState('');
  const [newName, setNewName] = useState('');

  const funnelFlags = flags.filter((f: any) => f.category === 'funnels');

  const handleToggle = async (
    id: string,
    field: 'free_access' | 'pro_access' | 'trial_access' | 'is_enabled',
    value: boolean,
    flag: any
  ) => {
    try {
      await updateFlag(id, { [field]: value });
      await logAdminAction('feature_flag_updated', 'feature', id, { [field]: flag[field] }, { [field]: value }, `Funnel feature "${flag.feature_name}" - ${field} → ${value}`);
      toast.success('Updated');
    } catch {
      toast.error('Failed to update');
    }
  };

  const handleLimitChange = async (id: string, field: 'free_limit' | 'pro_limit' | 'trial_limit', value: string, flag: any) => {
    const numVal = value === '' ? null : parseInt(value, 10);
    if (value !== '' && isNaN(numVal!)) return;
    try {
      await updateFlag(id, { [field]: numVal });
      await logAdminAction('feature_flag_updated', 'feature', id, { [field]: flag[field] }, { [field]: numVal }, `Funnel feature "${flag.feature_name}" - ${field} → ${numVal ?? '∞'}`);
      toast.success('Limit updated');
    } catch {
      toast.error('Failed to update limit');
    }
  };

  const handleAddFlag = async () => {
    if (!newKey.trim() || !newName.trim()) {
      toast.error('Key and name are required');
      return;
    }
    try {
      await createFlag({ feature_key: newKey.trim().toLowerCase(), feature_name: newName.trim(), category: 'funnels' });
      toast.success('Feature added');
      setNewKey('');
      setNewName('');
      setShowAdd(false);
    } catch {
      toast.error('Failed to add feature');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Funnel Feature Gates</h3>
        <Button size="sm" variant="outline" onClick={() => setShowAdd(!showAdd)}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Add
        </Button>
      </div>

      {showAdd && (
        <Card className="p-3 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <Input placeholder="feature_key" value={newKey} onChange={e => setNewKey(e.target.value)} className="text-xs" />
            <Input placeholder="Feature Name" value={newName} onChange={e => setNewName(e.target.value)} className="text-xs" />
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleAddFlag}>Add</Button>
            <Button size="sm" variant="ghost" onClick={() => setShowAdd(false)}>Cancel</Button>
          </div>
        </Card>
      )}

      {funnelFlags.length === 0 && (
        <p className="text-xs text-muted-foreground text-center py-4">No funnel feature flags found</p>
      )}

      <div className="grid gap-2">
        {funnelFlags.map((flag: any) => (
          <Card key={flag.id} className={`p-3 ${!flag.is_enabled ? 'opacity-50' : ''}`}>
            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-sm">{flag.feature_name}</span>
                <Badge variant="outline" className="text-[10px] font-mono">{flag.feature_key}</Badge>
                {!flag.is_enabled && <Badge variant="destructive" className="text-[10px]">Off</Badge>}
              </div>
              {flag.description && <p className="text-xs text-muted-foreground">{flag.description}</p>}

              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <Power className="h-3 w-3 text-muted-foreground" />
                  <Switch checked={flag.is_enabled} onCheckedChange={v => handleToggle(flag.id, 'is_enabled', v, flag)} />
                </div>
                <div className="h-4 w-px bg-border" />

                <div className={`inline-flex rounded-lg border overflow-hidden text-[11px] font-medium ${!flag.is_enabled ? 'opacity-40 pointer-events-none' : ''}`}>
                  <button
                    onClick={() => { if (!flag.free_access) handleToggle(flag.id, 'free_access', true, flag); }}
                    className={`px-3 py-1.5 flex items-center gap-1 transition-colors ${flag.free_access ? 'bg-primary text-primary-foreground' : 'bg-muted/50 text-muted-foreground hover:bg-muted'}`}
                  >
                    <Users className="h-3 w-3" /> Free
                  </button>
                  <button
                    onClick={() => { if (flag.free_access) handleToggle(flag.id, 'free_access', false, flag); }}
                    className={`px-3 py-1.5 flex items-center gap-1 transition-colors ${!flag.free_access ? 'bg-emerald-500 text-white' : 'bg-muted/50 text-muted-foreground hover:bg-muted'}`}
                  >
                    <Crown className="h-3 w-3" /> Pro Only
                  </button>
                </div>

                <div className={`flex items-center gap-1.5 ${!flag.is_enabled ? 'opacity-40 pointer-events-none' : ''}`}>
                  <FlaskConical className="h-3 w-3 text-blue-500" />
                  <span className="text-[10px] text-muted-foreground">Trial</span>
                  <Switch checked={flag.trial_access ?? true} disabled={!flag.is_enabled} onCheckedChange={v => handleToggle(flag.id, 'trial_access', v, flag)} />
                </div>
              </div>

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
  );
}
