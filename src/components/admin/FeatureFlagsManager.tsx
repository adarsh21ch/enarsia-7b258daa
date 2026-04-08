import { useState } from 'react';
import { useAdminFeatureFlags } from '@/hooks/useAdminConfig';
import { logAdminAction } from '@/hooks/useAuditLogs';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Loader2, Sparkles, Plus, MoreHorizontal, Hash } from 'lucide-react';
import { toast } from 'sonner';

const CATEGORY_ORDER = ['calling', 'leads', 'tracking', 'todo', 'export', 'automation', 'analytics', 'team', 'ai', 'general'];
const CATEGORY_LABELS: Record<string, string> = {
  calling: '📞 Calling', leads: '📋 Leads', tracking: '📊 Tracking', todo: '✅ To-Do',
  export: '📤 Export', automation: '⚙️ Automation', analytics: '📈 Analytics',
  team: '👥 Team', ai: '🤖 AI', general: '🔧 General',
};

const MODULE_ORDER = ['application', 'trackup', 'funnels'];
const MODULE_LABELS: Record<string, string> = {
  application: '📱 Application', trackup: '📊 TrackUp', funnels: '🎬 Funnels',
};

export function FeatureFlagsManager() {
  const { flags, loading, updateFlag, createFlag } = useAdminFeatureFlags();
  const [showAdd, setShowAdd] = useState(false);
  const [newKey, setNewKey] = useState('');
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState('general');
  const [moduleFilter, setModuleFilter] = useState<string>('all');
  const [editingLimits, setEditingLimits] = useState<Record<string, Record<string, string>>>({});

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
    if (!newKey.trim() || !newName.trim()) { toast.error('Key and name are required'); return; }
    try {
      await createFlag({ feature_key: newKey.trim().toLowerCase(), feature_name: newName.trim(), category: newCategory });
      toast.success('Feature added');
      setNewKey(''); setNewName(''); setShowAdd(false);
    } catch (err) { toast.error('Failed to add feature'); }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  // Group flags by module then category
  const filteredFlags = moduleFilter === 'all' ? flags : flags.filter((f: any) => (f.module || 'application') === moduleFilter);

  const groupedByModule = filteredFlags.reduce((acc: Record<string, Record<string, any[]>>, flag: any) => {
    const mod = flag.module || 'application';
    const cat = flag.category || 'general';
    if (!acc[mod]) acc[mod] = {};
    if (!acc[mod][cat]) acc[mod][cat] = [];
    acc[mod][cat].push(flag);
    return acc;
  }, {} as Record<string, Record<string, any[]>>);

  const sortedModules = MODULE_ORDER.filter(m => groupedByModule[m]);
  Object.keys(groupedByModule).forEach(m => { if (!sortedModules.includes(m)) sortedModules.push(m); });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Feature Registry</h2>
          <p className="text-sm text-muted-foreground">Control feature access by plan tier</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={moduleFilter} onValueChange={setModuleFilter}>
            <SelectTrigger className="w-[140px] h-8 text-xs">
              <SelectValue placeholder="All Modules" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Modules</SelectItem>
              {MODULE_ORDER.map(m => <SelectItem key={m} value={m}>{MODULE_LABELS[m] || m}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button size="sm" variant="outline" onClick={() => setShowAdd(!showAdd)}>
            <Plus className="h-4 w-4 mr-1" /> Add
          </Button>
        </div>
      </div>

      {showAdd && (
        <Card className="p-4 space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <Input placeholder="feature_key" value={newKey} onChange={e => setNewKey(e.target.value)} className="text-sm" />
            <Input placeholder="Feature Name" value={newName} onChange={e => setNewName(e.target.value)} className="text-sm" />
            <select className="border rounded-md px-2 text-sm bg-background" value={newCategory} onChange={e => setNewCategory(e.target.value)}>
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
        const categoriesInModule = groupedByModule[mod];
        const sortedCats = CATEGORY_ORDER.filter(c => categoriesInModule[c]?.length > 0);
        Object.keys(categoriesInModule).forEach(c => { if (!sortedCats.includes(c)) sortedCats.push(c); });

        return (
          <div key={mod} className="space-y-3">
            <h3 className="text-sm font-bold tracking-wide">{MODULE_LABELS[mod] || mod}</h3>

            {sortedCats.map(category => (
              <div key={category} className="space-y-1">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">
                  {CATEGORY_LABELS[category] || category}
                </h4>
                <div className="rounded-lg border border-border/50 bg-card overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="text-[11px] w-8">On</TableHead>
                        <TableHead className="text-[11px]">Feature</TableHead>
                        <TableHead className="text-[11px] w-28 text-center">
                          <div className="flex items-center justify-between px-1">
                            <span className="text-muted-foreground">Free</span>
                            <span className="font-semibold">Pro</span>
                          </div>
                        </TableHead>
                        <TableHead className="text-[11px] w-10"><span className="sr-only">Actions</span></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {categoriesInModule[category].map((flag: any) => {
                        // Single toggle: off = Free (required_tier=basic), on = Pro (required_tier=pro)
                        const isPro = (flag.required_tier || 'basic') !== 'basic';
                        const handleTierToggle = async (checked: boolean) => {
                          const newTier = checked ? 'pro' : 'basic';
                          await handleFieldChange(flag.id, 'required_tier', newTier, flag);
                        };
                        return (
                          <TableRow key={flag.id} className={!flag.is_enabled ? 'opacity-50' : ''}>
                            <TableCell className="py-1.5 px-2">
                              <Switch checked={flag.is_enabled} onCheckedChange={v => handleToggle(flag.id, 'is_enabled', v, flag)} className="scale-75" />
                            </TableCell>
                            <TableCell className="py-1.5 px-2">
                              <div>
                                <span className="text-sm font-medium">{flag.feature_name}</span>
                                <span className="text-[10px] text-muted-foreground font-mono ml-1.5">{flag.feature_key}</span>
                              </div>
                            </TableCell>
                            <TableCell className="py-1.5 px-2 text-center">
                              <Switch
                                checked={isPro}
                                onCheckedChange={handleTierToggle}
                                disabled={!flag.is_enabled}
                                className="scale-75"
                              />
                            </TableCell>
                            <TableCell className="py-1.5 px-1">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                    <MoreHorizontal className="h-3.5 w-3.5" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-56">
                                  <div className="px-3 py-2 space-y-2">
                                    <p className="text-xs font-medium flex items-center gap-1"><Hash className="h-3 w-3" /> Limits</p>
                                    {(['free_limit', 'pro_limit'] as const).map(field => (
                                      <div key={field} className="flex items-center gap-2">
                                        <span className="text-[10px] text-muted-foreground w-10 capitalize">{field === 'free_limit' ? 'Free' : 'Pro'}</span>
                                        <Input
                                          type="number"
                                          className="h-6 w-20 text-xs px-1"
                                          placeholder="∞"
                                          defaultValue={flag[field] ?? ''}
                                          onBlur={e => handleLimitChange(flag.id, field, e.target.value, flag)}
                                          onKeyDown={e => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                                        />
                                      </div>
                                    ))}
                                  </div>
                                  <DropdownMenuItem className="text-xs" onClick={() => handleFieldChange(flag.id, 'module', flag.module === 'application' ? 'trackup' : 'application', flag)}>
                                    Change Module
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
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
