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
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Loader2, Plus, Pencil, Crown, Clock, IndianRupee, Star, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { PlanSequenceControl } from '@/components/admin/PlanSequenceControl';

export function PlansManager() {
  const { plans, loading, createPlan, updatePlan, reorderPlans, deletePlan } = useAdminPlans();
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [reorderingPlanId, setReorderingPlanId] = useState<string | null>(null);

  const handleToggleActive = async (plan: SubscriptionPlan) => {
    try {
      const oldValue = { is_active: plan.is_active };
      const newValue = { is_active: !plan.is_active };
      await updatePlan(plan.id, newValue);
      await logAdminAction(
        'plan_updated', 'plan', plan.id, oldValue, newValue,
        `Plan "${plan.plan_name}" ${plan.is_active ? 'deactivated' : 'activated'}`
      );
      toast.success(`Plan ${plan.is_active ? 'deactivated' : 'activated'}`);
    } catch (err) {
      toast.error('Failed to update plan status');
    }
  };

  const handleToggleDefault = async (plan: SubscriptionPlan) => {
    try {
      for (const p of plans) {
        if (p.is_default && p.id !== plan.id) {
          await updatePlan(p.id, { is_default: false });
        }
      }
      await updatePlan(plan.id, { is_default: true });
      await logAdminAction(
        'plan_updated', 'plan', plan.id, { is_default: false }, { is_default: true },
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
      await logAdminAction(
        'plan_deleted', 'plan', plan.id,
        { plan_name: plan.plan_name, plan_key: plan.plan_key, price_inr: plan.price_inr },
        null, `Deleted plan "${plan.plan_name}"`
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

  const handleMoveToPosition = async (
    list: SubscriptionPlan[], plan: SubscriptionPlan, nextPosition: number
  ) => {
    const fromIndex = list.findIndex((item) => item.id === plan.id);
    const toIndex = nextPosition - 1;
    if (fromIndex < 0 || toIndex < 0 || toIndex >= list.length || fromIndex === toIndex) return;

    const reordered = [...list];
    const [movedPlan] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, movedPlan);

    const planUpdates = reordered
      .map((item, index) => ({ id: item.id, sort_order: index + 1 }))
      .filter(({ id, sort_order }) => {
        const currentPlan = list.find((item) => item.id === id);
        return (currentPlan?.sort_order ?? 0) !== sort_order;
      });
    if (planUpdates.length === 0) return;

    setReorderingPlanId(plan.id);
    try {
      await reorderPlans(planUpdates);
      await logAdminAction(
        'plan_reordered', 'plan', plan.id,
        { position: fromIndex + 1 }, { position: nextPosition },
        `Moved "${plan.plan_name}" to position #${nextPosition}`
      );
      toast.success('Plan sequence updated');
    } catch {
      toast.error('Failed to update plan sequence');
    } finally {
      setReorderingPlanId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Filter to only paid plans (pro/premium tier) - shown as "Pro"
  const paidPlans = plans.filter(p => (p.tier || 'pro') !== 'basic');
  const activePlans = [...paidPlans.filter(p => p.is_active)].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  const inactivePlans = [...paidPlans.filter(p => !p.is_active)].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Subscription Plans</h2>
          <p className="text-sm text-muted-foreground">Manage Pro plan pricing, duration, and features</p>
        </div>
        <Button size="sm" onClick={() => openEditSheet(null)}>
          <Plus className="h-4 w-4 mr-1" />
          Add Plan
        </Button>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <Crown className="h-4 w-4 text-primary" />
          Pro Plans
        </h3>
        {activePlans.length > 0 && (
          <div className="grid gap-3">
            {activePlans.map((plan, idx) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                onEdit={() => openEditSheet(plan)}
                onToggleActive={() => handleToggleActive(plan)}
                onToggleDefault={() => handleToggleDefault(plan)}
                onDelete={() => handleDelete(plan)}
                onReorder={(nextPosition) => handleMoveToPosition(activePlans, plan, nextPosition)}
                position={idx + 1}
                totalPositions={activePlans.length}
                isReordering={reorderingPlanId === plan.id}
              />
            ))}
          </div>
        )}
        {inactivePlans.length > 0 && (
          <div className="grid gap-3 opacity-60">
            <p className="text-xs text-muted-foreground">Inactive</p>
            {inactivePlans.map((plan, idx) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                onEdit={() => openEditSheet(plan)}
                onToggleActive={() => handleToggleActive(plan)}
                onToggleDefault={() => handleToggleDefault(plan)}
                onDelete={() => handleDelete(plan)}
                onReorder={(nextPosition) => handleMoveToPosition(inactivePlans, plan, nextPosition)}
                position={idx + 1}
                totalPositions={inactivePlans.length}
                isReordering={reorderingPlanId === plan.id}
              />
            ))}
          </div>
        )}
        {activePlans.length === 0 && inactivePlans.length === 0 && (
          <Card className="p-8 text-center text-muted-foreground">
            <p>No plans configured yet. Click "Add Plan" to create one.</p>
          </Card>
        )}
      </div>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{isCreating ? 'Create Pro Plan' : 'Edit Pro Plan'}</SheetTitle>
          </SheetHeader>
          <PlanEditForm
            plan={editingPlan}
            existingPlansCount={activePlans.length}
            onSave={async (data) => {
              try {
                const sanitizedData = {
                  ...data,
                  price_inr: Number(data.price_inr) || 0,
                  duration_days: Number(data.duration_days) || 30,
                  sort_order: Number(data.sort_order) || 0,
                  tier: 'pro' as SubscriptionTier, // Always Pro
                };

                if (isCreating) {
                  // Auto-generate plan_key
                  const months = Math.round((sanitizedData.duration_days || 30) / 30);
                  const billingType = sanitizedData.billing_type || 'one_time';
                  const autoKey = `pro_${months}m_${billingType}_${Date.now().toString(36)}`;
                  sanitizedData.plan_key = autoKey;
                  sanitizedData.plan_name = data.plan_name || `Pro ${months === 1 ? 'Monthly' : months === 6 ? '6 Months' : months === 12 ? 'Yearly' : `${months}M`}`;

                  const newPlan = await createPlan(sanitizedData);
                  await logAdminAction(
                    'plan_created', 'plan', newPlan?.id || 'unknown', null,
                    { plan_name: sanitizedData.plan_name, price_inr: sanitizedData.price_inr },
                    `Created plan "${sanitizedData.plan_name}"`
                  );
                  toast.success('Plan created');
                } else if (editingPlan) {
                  const oldData = {
                    plan_name: editingPlan.plan_name,
                    price_inr: editingPlan.price_inr,
                    duration_days: editingPlan.duration_days,
                  };
                  await updatePlan(editingPlan.id, sanitizedData);
                  await logAdminAction(
                    'plan_updated', 'plan', editingPlan.id, oldData,
                    { plan_name: sanitizedData.plan_name, price_inr: sanitizedData.price_inr, duration_days: sanitizedData.duration_days },
                    `Updated plan "${sanitizedData.plan_name}"`
                  );
                  toast.success('Plan updated');
                }
                setSheetOpen(false);
              } catch (err: any) {
                console.error('Plan save error:', err);
                const msg = err?.message || '';
                if (msg.includes('duplicate key') || msg.includes('unique constraint') || msg.includes('plan_key')) {
                  toast.error('A plan with this key already exists. Please try again.');
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
  plan, onEdit, onToggleActive, onToggleDefault, onDelete, onReorder,
  position, totalPositions, isReordering,
}: {
  plan: SubscriptionPlan;
  onEdit: () => void;
  onToggleActive: () => void;
  onToggleDefault: () => void;
  onDelete: () => void;
  onReorder: (nextPosition: number) => void;
  position?: number;
  totalPositions: number;
  isReordering?: boolean;
}) {
  return (
    <Card className="border-border/60 bg-card/95 p-4 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            {position ? (
              <PlanSequenceControl
                position={position}
                total={totalPositions}
                disabled={isReordering}
                onChange={onReorder}
              />
            ) : null}
            {position && (
              <Badge variant="outline" className="text-[10px] tabular-nums">#{position}</Badge>
            )}
            <Crown className="h-4 w-4 text-primary" />
            <span className="font-semibold">{plan.plan_name}</span>
            {(plan as any).display_name && (
              <span className="text-xs text-muted-foreground">→ {(plan as any).display_name}</span>
            )}
            <Badge variant="outline" className="text-[10px] uppercase">Pro</Badge>
            {plan.badge_text && (
              <Badge variant="secondary" className="text-xs">
                <Star className="h-3 w-3 mr-1" />
                {plan.badge_text}
              </Badge>
            )}
            {plan.is_default && (
              <Badge variant="outline" className="border-border bg-secondary text-secondary-foreground text-xs">
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
          </div>
        </div>
        <div className="flex items-center gap-1 rounded-full border border-border/60 bg-muted/30 p-1 shrink-0">
          <Switch
            checked={plan.is_active}
            onCheckedChange={onToggleActive}
            aria-label="Toggle active"
            disabled={isReordering}
          />
          <Button variant="ghost" size="icon" onClick={onEdit} disabled={isReordering}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onDelete} disabled={isReordering} className="text-destructive hover:text-destructive">
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
  plan, existingPlansCount, onSave, onCancel,
}: {
  plan: SubscriptionPlan | null;
  existingPlansCount: number;
  onSave: (data: Partial<SubscriptionPlan>) => Promise<void>;
  onCancel: () => void;
}) {
  const isEditing = !!plan;
  const [formData, setFormData] = useState({
    plan_key: plan?.plan_key || '',
    plan_name: plan?.plan_name || '',
    display_name: (plan as any)?.display_name || '',
    description: plan?.description || '',
    price_inr: plan?.price_inr || 149,
    duration_days: plan?.duration_days || 30,
    billing_type: (plan?.billing_type || 'one_time') as 'one_time' | 'recurring',
    razorpay_plan_id: plan?.razorpay_plan_id || '',
    razorpay_offer_id: (plan as any)?.razorpay_offer_id || '',

    badge_text: plan?.badge_text || '',
    features: (plan?.features || []).join('\n'),
    sort_order: plan?.sort_order || (existingPlansCount + 1),
    // ---- new admin-controlled pricing fields ----
    monthly_price_inr: (plan as any)?.monthly_price_inr ?? '',
    yearly_price_inr: (plan as any)?.yearly_price_inr ?? '',
    first_month_price_inr: (plan as any)?.first_month_price_inr ?? '',
    renewal_price_inr: (plan as any)?.renewal_price_inr ?? '',
    trial_days: (plan as any)?.trial_days ?? 0,
    billing_cycle: ((plan as any)?.billing_cycle || 'monthly') as 'monthly' | 'yearly' | 'one_time',
    offer_badge_text: (plan as any)?.offer_badge_text || '',
    is_popular: !!(plan as any)?.is_popular,
    is_free: !!(plan as any)?.is_free,
    cancel_anytime: (plan as any)?.cancel_anytime !== false,
    highlight_savings_text: (plan as any)?.highlight_savings_text || '',
  });

  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.price_inr <= 0) {
      toast.error('Price must be greater than 0');
      return;
    }
    if (formData.duration_days <= 0) {
      toast.error('Duration must be greater than 0');
      return;
    }
    if (formData.billing_type === 'recurring' && !formData.razorpay_plan_id?.trim()) {
      toast.error('Razorpay Plan ID is required for recurring billing');
      return;
    }
    setSaving(true);
    try {
      const toIntOrNull = (v: any) => {
        if (v === '' || v === null || v === undefined) return null;
        const n = parseInt(String(v));
        return Number.isFinite(n) ? n : null;
      };
      await onSave({
        ...formData,
        monthly_price_inr: toIntOrNull(formData.monthly_price_inr),
        yearly_price_inr: toIntOrNull(formData.yearly_price_inr),
        first_month_price_inr: toIntOrNull(formData.first_month_price_inr),
        renewal_price_inr: toIntOrNull(formData.renewal_price_inr) ?? formData.price_inr,
        trial_days: Number(formData.trial_days) || 0,
        features: formData.features.split('\n').filter(f => f.trim()),
      } as any);
    } finally {
      setSaving(false);
    }
  };


  return (
    <form onSubmit={handleSubmit} className="space-y-4 mt-4">
      <div className="space-y-2">
        <Label htmlFor="plan_name">Plan Name</Label>
        <Input
          id="plan_name"
          placeholder="e.g., Pro Monthly, Pro 6 Months"
          value={formData.plan_name}
          onChange={(e) => setFormData(prev => ({ ...prev, plan_name: e.target.value }))}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="display_name">Display Name (optional)</Label>
        <Input
          id="display_name"
          placeholder="e.g., 3 Months + 1 Month FREE"
          value={formData.display_name}
          onChange={(e) => setFormData(prev => ({ ...prev, display_name: e.target.value }))}
        />
        <p className="text-xs text-muted-foreground">Marketing-friendly name shown on upgrade page. Leave empty to use plan name.</p>
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

      <div className="grid grid-cols-2 gap-4">
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
      </div>

      <div className="space-y-2">
        <Label htmlFor="billing_type">Billing Type</Label>
        <select
          id="billing_type"
          value={formData.billing_type}
          onChange={(e) => setFormData(prev => ({ ...prev, billing_type: e.target.value as 'one_time' | 'recurring' }))}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <option value="one_time">One Time</option>
          <option value="recurring">Recurring</option>
        </select>
      </div>

      {formData.billing_type === 'recurring' && (
        <div className="space-y-2">
          <Label htmlFor="razorpay_plan_id">Razorpay Plan ID</Label>
          <Input
            id="razorpay_plan_id"
            placeholder="plan_XXXXX"
            value={formData.razorpay_plan_id}
            onChange={(e) => setFormData(prev => ({ ...prev, razorpay_plan_id: e.target.value }))}
            required
          />
          <p className="text-xs text-muted-foreground">Required for recurring billing. Create in Razorpay Dashboard → Subscriptions → Plans.</p>

          <div className="space-y-2 pt-2">
            <Label htmlFor="razorpay_offer_id">Razorpay Offer ID (optional)</Label>
            <Input
              id="razorpay_offer_id"
              placeholder="offer_XXXXX"
              value={formData.razorpay_offer_id}
              onChange={(e) => setFormData(prev => ({ ...prev, razorpay_offer_id: e.target.value }))}
            />
            <p className="text-xs text-muted-foreground">Discounts the first invoice only (e.g. ₹59 first month, then renews at the plan price). Create in Razorpay Dashboard → Offers.</p>
          </div>

        </div>
      )}

      {/* ----- Intro / renewal / pricing matrix ----- */}
      <div className="rounded-xl border border-border/60 bg-muted/20 p-3 space-y-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Pricing & Offers</p>

        <div className="space-y-2">
          <Label>Billing Cycle</Label>
          <select
            value={formData.billing_cycle}
            onChange={(e) => setFormData(p => ({ ...p, billing_cycle: e.target.value as any }))}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
            <option value="one_time">One-time</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Monthly Price (₹)</Label>
            <Input type="number" min="0" value={formData.monthly_price_inr}
              onChange={(e) => setFormData(p => ({ ...p, monthly_price_inr: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Yearly Price (₹)</Label>
            <Input type="number" min="0" value={formData.yearly_price_inr}
              onChange={(e) => setFormData(p => ({ ...p, yearly_price_inr: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">First Month Price (₹)</Label>
            <Input type="number" min="0" placeholder="e.g. 59" value={formData.first_month_price_inr}
              onChange={(e) => setFormData(p => ({ ...p, first_month_price_inr: e.target.value }))} />
            <p className="text-[10px] text-muted-foreground">Charged only on the first cycle.</p>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Renewal Price (₹)</Label>
            <Input type="number" min="0" placeholder="e.g. 149" value={formData.renewal_price_inr}
              onChange={(e) => setFormData(p => ({ ...p, renewal_price_inr: e.target.value }))} />
            <p className="text-[10px] text-muted-foreground">Charged from cycle 2 onward.</p>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Trial Days</Label>
            <Input type="number" min="0" value={formData.trial_days}
              onChange={(e) => setFormData(p => ({ ...p, trial_days: parseInt(e.target.value) || 0 }))} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Offer Badge</Label>
            <Input placeholder="e.g. Launch Offer" value={formData.offer_badge_text}
              onChange={(e) => setFormData(p => ({ ...p, offer_badge_text: e.target.value }))} />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Savings Highlight</Label>
          <Input placeholder="e.g. Save ₹1080/year" value={formData.highlight_savings_text}
            onChange={(e) => setFormData(p => ({ ...p, highlight_savings_text: e.target.value }))} />
        </div>

        <div className="grid grid-cols-3 gap-2 pt-1">
          <label className="flex items-center gap-2 text-xs">
            <Switch checked={formData.is_popular}
              onCheckedChange={(v) => setFormData(p => ({ ...p, is_popular: v }))} />
            Most Popular
          </label>
          <label className="flex items-center gap-2 text-xs">
            <Switch checked={formData.cancel_anytime}
              onCheckedChange={(v) => setFormData(p => ({ ...p, cancel_anytime: v }))} />
            Cancel anytime
          </label>
          <label className="flex items-center gap-2 text-xs">
            <Switch checked={formData.is_free}
              onCheckedChange={(v) => setFormData(p => ({ ...p, is_free: v }))} />
            Free Plan
          </label>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="badge_text">Internal Badge Text (legacy)</Label>
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
