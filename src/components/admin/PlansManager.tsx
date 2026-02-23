import { useState } from 'react';
import { useAdminPlans, SubscriptionPlan, SubscriptionTier } from '@/hooks/useAdminConfig';
import { logAdminAction } from '@/hooks/useAuditLogs';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Loader2, Plus, Pencil, Crown, Link as LinkIcon, Clock, IndianRupee, Star, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export function PlansManager() {
  const { plans, loading, createPlan, updatePlan, deletePlan } = useAdminPlans();
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  const handleToggleActive = async (plan: SubscriptionPlan) => {
    try {
      const oldValue = { is_active: plan.is_active };
      const newValue = { is_active: !plan.is_active };
      await updatePlan(plan.id, newValue);
      
      // Log audit action
      await logAdminAction(
        'plan_updated',
        'plan',
        plan.id,
        oldValue,
        newValue,
        `Plan "${plan.plan_name}" ${plan.is_active ? 'deactivated' : 'activated'}`
      );
      
      toast.success(`Plan ${plan.is_active ? 'deactivated' : 'activated'}`);
    } catch (err) {
      toast.error('Failed to update plan status');
    }
  };

  const handleToggleDefault = async (plan: SubscriptionPlan) => {
    try {
      // First, remove default from all plans
      for (const p of plans) {
        if (p.is_default && p.id !== plan.id) {
          await updatePlan(p.id, { is_default: false });
        }
      }
      await updatePlan(plan.id, { is_default: true });
      
      // Log audit action
      await logAdminAction(
        'plan_updated',
        'plan',
        plan.id,
        { is_default: false },
        { is_default: true },
        `Plan "${plan.plan_name}" set as default`
      );
      
      toast.success(`${plan.plan_name} is now the default plan`);
    } catch (err) {
      toast.error('Failed to set default plan');
    }
  };

  const handleDelete = async (plan: SubscriptionPlan) => {
    if (!confirm(`Delete "${plan.plan_name}"? This cannot be undone.`)) return;
    try {
      await deletePlan(plan.id);
      
      // Log audit action
      await logAdminAction(
        'plan_deleted',
        'plan',
        plan.id,
        { plan_name: plan.plan_name, plan_key: plan.plan_key, price_inr: plan.price_inr },
        null,
        `Deleted plan "${plan.plan_name}"`
      );
      
      toast.success('Plan deleted');
    } catch (err) {
      toast.error('Failed to delete plan');
    }
  };

  const openEditSheet = (plan: SubscriptionPlan | null) => {
    setEditingPlan(plan);
    setIsCreating(!plan);
    setSheetOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Group plans by tier
  const tierOrder: SubscriptionTier[] = ['basic', 'pro', 'premium'];
  const tierLabels: Record<SubscriptionTier, string> = { basic: '🆓 Free', pro: '⭐ Basic', premium: '💎 Pro' };

  const plansByTier = tierOrder.map(tier => ({
    tier,
    label: tierLabels[tier],
    active: plans.filter(p => p.is_active && (p.tier || 'pro') === tier),
    inactive: plans.filter(p => !p.is_active && (p.tier || 'pro') === tier),
  })).filter(g => g.active.length > 0 || g.inactive.length > 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Subscription Plans</h2>
          <p className="text-sm text-muted-foreground">Manage pricing, features, and payment links</p>
        </div>
        <Button size="sm" onClick={() => openEditSheet(null)}>
          <Plus className="h-4 w-4 mr-1" />
          Add Plan
        </Button>
      </div>

      {plansByTier.map(({ tier, label, active, inactive }) => (
        <div key={tier} className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">{label}</h3>
          {active.length > 0 && (
            <div className="grid gap-3">
              {active.map((plan) => (
                <PlanCard 
                  key={plan.id} 
                  plan={plan}
                  onEdit={() => openEditSheet(plan)}
                  onToggleActive={() => handleToggleActive(plan)}
                  onToggleDefault={() => handleToggleDefault(plan)}
                  onDelete={() => handleDelete(plan)}
                />
              ))}
            </div>
          )}
          {inactive.length > 0 && (
            <div className="grid gap-3 opacity-60">
              {inactive.map((plan) => (
                <PlanCard 
                  key={plan.id} 
                  plan={plan}
                  onEdit={() => openEditSheet(plan)}
                  onToggleActive={() => handleToggleActive(plan)}
                  onToggleDefault={() => handleToggleDefault(plan)}
                  onDelete={() => handleDelete(plan)}
                />
              ))}
            </div>
          )}
        </div>
      ))}

      {/* Edit/Create Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{isCreating ? 'Create New Plan' : 'Edit Plan'}</SheetTitle>
          </SheetHeader>
          <PlanEditForm 
            plan={editingPlan}
            onSave={async (data) => {
            try {
                // Validation based on billing_type
                const billingType = data.billing_type || 'one_time';
                if (billingType === 'one_time' && !data.payment_link?.trim()) {
                  toast.error('Payment link is required for one-time plans');
                  return;
                }
                if (billingType === 'recurring' && !data.razorpay_plan_id?.trim()) {
                  toast.error('Razorpay Plan ID is required for recurring plans');
                  return;
                }

                // Ensure proper data types for numeric fields
                const sanitizedData = {
                  ...data,
                  price_inr: Number(data.price_inr) || 0,
                  duration_days: Number(data.duration_days) || 30,
                  sort_order: Number(data.sort_order) || 0,
                };
                
                if (isCreating) {
                  const newPlan = await createPlan(sanitizedData);
                  // Log audit action
                  await logAdminAction(
                    'plan_created',
                    'plan',
                    newPlan?.id || 'unknown',
                    null,
                    { plan_name: sanitizedData.plan_name, plan_key: sanitizedData.plan_key, price_inr: sanitizedData.price_inr },
                    `Created plan "${sanitizedData.plan_name}"`
                  );
                  toast.success('Plan created');
                } else if (editingPlan) {
                  const oldData = {
                    plan_name: editingPlan.plan_name,
                    price_inr: editingPlan.price_inr,
                    duration_days: editingPlan.duration_days,
                    payment_link: editingPlan.payment_link,
                  };
                  await updatePlan(editingPlan.id, sanitizedData);
                  // Log audit action
                  await logAdminAction(
                    'plan_updated',
                    'plan',
                    editingPlan.id,
                    oldData,
                    { plan_name: sanitizedData.plan_name, price_inr: sanitizedData.price_inr, duration_days: sanitizedData.duration_days, payment_link: sanitizedData.payment_link },
                    `Updated plan "${sanitizedData.plan_name}"`
                  );
                  toast.success('Plan updated');
                }
                setSheetOpen(false);
              } catch (err: any) {
                console.error('Plan save error:', err);
                const msg = err?.message || '';
                if (msg.includes('duplicate key') || msg.includes('unique constraint') || msg.includes('plan_key')) {
                  toast.error('A plan with this key already exists. Use a unique plan key.');
                } else {
                  toast.error('Failed to save plan');
                }
              }
            }}
            onCancel={() => setSheetOpen(false)}
          />
        </SheetContent>
      </Sheet>
    </div>
  );
}

function PlanCard({ 
  plan, 
  onEdit, 
  onToggleActive, 
  onToggleDefault,
  onDelete 
}: { 
  plan: SubscriptionPlan;
  onEdit: () => void;
  onToggleActive: () => void;
  onToggleDefault: () => void;
  onDelete: () => void;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Crown className="h-4 w-4 text-primary" />
            <span className="font-semibold">{plan.plan_name}</span>
            {(plan as any).display_name && (
              <span className="text-xs text-muted-foreground">→ {(plan as any).display_name}</span>
            )}
            <Badge variant="outline" className="text-[10px] uppercase">
              {plan.tier || 'pro'}
            </Badge>
            {plan.badge_text && (
              <Badge variant="secondary" className="text-xs">
                <Star className="h-3 w-3 mr-1" />
                {plan.badge_text}
              </Badge>
            )}
            {plan.is_default && (
              <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/30">
                Default
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground mb-2">{plan.description}</p>
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <IndianRupee className="h-3 w-3" />
              ₹{plan.price_inr}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {plan.duration_days} days
            </span>
            {plan.billing_type === 'recurring' && (
              <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-600 border-blue-500/30">
                Recurring
              </Badge>
            )}
            {plan.billing_type !== 'recurring' && plan.payment_link && (
              <span className="flex items-center gap-1 truncate max-w-[200px]">
                <LinkIcon className="h-3 w-3 shrink-0" />
                <span className="truncate">{plan.payment_link}</span>
              </span>
            )}
            {plan.billing_type === 'recurring' && plan.razorpay_plan_id && (
              <span className="flex items-center gap-1 truncate max-w-[200px]">
                <LinkIcon className="h-3 w-3 shrink-0" />
                <span className="truncate">{plan.razorpay_plan_id}</span>
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Switch 
            checked={plan.is_active} 
            onCheckedChange={onToggleActive}
            aria-label="Toggle active"
          />
          <Button variant="ghost" size="icon" onClick={onEdit}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onDelete} className="text-destructive hover:text-destructive">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
      {!plan.is_default && plan.is_active && (
        <Button variant="ghost" size="sm" onClick={onToggleDefault} className="mt-2 text-xs">
          Set as Default
        </Button>
      )}
    </Card>
  );
}

function PlanEditForm({ 
  plan, 
  onSave, 
  onCancel 
}: { 
  plan: SubscriptionPlan | null;
  onSave: (data: Partial<SubscriptionPlan>) => Promise<void>;
  onCancel: () => void;
}) {
  const isEditing = !!plan;
  const [formData, setFormData] = useState({
    plan_key: plan?.plan_key || '',
    plan_name: plan?.plan_name || '',
    display_name: (plan as any)?.display_name || '',
    description: plan?.description || '',
    price_inr: plan?.price_inr || 99,
    duration_days: plan?.duration_days || 30,
    payment_link: plan?.payment_link || '',
    billing_type: (plan?.billing_type || 'one_time') as 'one_time' | 'recurring',
    razorpay_plan_id: plan?.razorpay_plan_id || '',
    tier: (plan?.tier || 'pro') as SubscriptionTier,
    badge_text: plan?.badge_text || '',
    features: (plan?.features || []).join('\n'),
    sort_order: plan?.sort_order || 0,
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({
        ...formData,
        features: formData.features.split('\n').filter(f => f.trim()),
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 mt-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="plan_key">Plan Key</Label>
          <Input
            id="plan_key"
            placeholder="e.g., monthly"
            value={formData.plan_key}
            onChange={(e) => setFormData(prev => ({ ...prev, plan_key: e.target.value }))}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="plan_name">Internal Name</Label>
          <Input
            id="plan_name"
            placeholder="e.g., Pro Monthly"
            value={formData.plan_name}
            onChange={(e) => setFormData(prev => ({ ...prev, plan_name: e.target.value }))}
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="display_name">Display Name (shown to users)</Label>
        <Input
          id="display_name"
          placeholder="e.g., 3 Months + 1 Month FREE"
          value={formData.display_name}
          onChange={(e) => setFormData(prev => ({ ...prev, display_name: e.target.value }))}
        />
        <p className="text-xs text-muted-foreground">Marketing-friendly name shown on upgrade page. Leave empty to use internal name.</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Input
          id="description"
          placeholder="Short description"
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="price_inr">Price (₹)</Label>
          <Input
            id="price_inr"
            type="number"
            min="1"
            value={formData.price_inr}
            onChange={(e) => setFormData(prev => ({ ...prev, price_inr: parseInt(e.target.value) || 0 }))}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="duration_days">Duration (days)</Label>
          <Input
            id="duration_days"
            type="number"
            min="1"
            value={formData.duration_days}
            onChange={(e) => setFormData(prev => ({ ...prev, duration_days: parseInt(e.target.value) || 0 }))}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="sort_order">Sort Order</Label>
          <Input
            id="sort_order"
            type="number"
            value={formData.sort_order}
            onChange={(e) => setFormData(prev => ({ ...prev, sort_order: parseInt(e.target.value) || 0 }))}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="tier">Tier</Label>
          <select
            id="tier"
            value={formData.tier}
            onChange={(e) => {
              const tier = e.target.value as SubscriptionTier;
              const autoKey = !isEditing ? `${tier}_${formData.billing_type}` : formData.plan_key;
              setFormData(prev => ({
                ...prev,
                tier,
                plan_key: isEditing ? prev.plan_key : autoKey,
                price_inr: tier === 'basic' ? 0 : prev.price_inr,
              }));
            }}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <option value="basic">Free</option>
            <option value="pro">Basic</option>
            <option value="premium">Pro</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="billing_type">Billing Type</Label>
          <select
            id="billing_type"
            value={formData.billing_type}
            onChange={(e) => {
              const billing_type = e.target.value as 'one_time' | 'recurring';
              const autoKey = !isEditing ? `${formData.tier}_${billing_type}` : formData.plan_key;
              setFormData(prev => ({ ...prev, billing_type, plan_key: isEditing ? prev.plan_key : autoKey }));
            }}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <option value="one_time">One Time</option>
            <option value="recurring">Recurring</option>
          </select>
        </div>
      </div>

      {formData.billing_type === 'one_time' ? (
        <div className="space-y-2">
          <Label htmlFor="payment_link">Razorpay Payment Link</Label>
          <Input
            id="payment_link"
            placeholder="https://rzp.io/..."
            value={formData.payment_link}
            onChange={(e) => setFormData(prev => ({ ...prev, payment_link: e.target.value }))}
          />
        </div>
      ) : (
        <div className="space-y-2">
          <Label htmlFor="razorpay_plan_id">Razorpay Plan ID</Label>
          <Input
            id="razorpay_plan_id"
            placeholder="plan_XXXXX"
            value={formData.razorpay_plan_id}
            onChange={(e) => setFormData(prev => ({ ...prev, razorpay_plan_id: e.target.value }))}
          />
          <p className="text-xs text-muted-foreground">Create a plan in Razorpay Dashboard → Subscriptions → Plans</p>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="badge_text">Badge Text (optional)</Label>
        <Input
          id="badge_text"
          placeholder="e.g., Best Value"
          value={formData.badge_text}
          onChange={(e) => setFormData(prev => ({ ...prev, badge_text: e.target.value }))}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="features">Features (one per line)</Label>
        <Textarea
          id="features"
          placeholder="Unlimited prospects&#10;Team sync&#10;Export data"
          value={formData.features}
          onChange={(e) => setFormData(prev => ({ ...prev, features: e.target.value }))}
          rows={6}
        />
      </div>

      <div className="flex gap-2 pt-4">
        <Button type="submit" disabled={saving} className="flex-1">
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          Save Plan
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
