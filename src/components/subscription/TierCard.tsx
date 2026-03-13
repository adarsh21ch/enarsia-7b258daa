import { Crown, Check, Star, Gem, X } from 'lucide-react';
import { PlanConfig } from '@/hooks/usePaymentLinks';
import { Badge } from '@/components/ui/badge';

const BASIC_FEATURES = [
  'Full Application Access (Calling + Follow-up)',
  'TrackUp Dashboard (Advanced Tracking)',
  'Higher Limits & Productivity Tools',
  'Faster Workflow & Automation',
];

const BASIC_EXCLUDED_FEATURES = [
  'Nevorai Funnels',
  'Funnel Video Insights',
  'Advanced Analytics',
  'Leader Tools',
];

const PRO_FEATURES = [
  'Everything in Basic',
  'Nevorai Funnels',
  'Funnel Video Insights',
  'Advanced Analytics',
  'Leader Tools',
  'Priority Support',
];

interface TierCardProps {
  tierName: string;
  plans: PlanConfig[];
  isPremium?: boolean;
  selectedPlanKey: string;
  onSelectPlan: (planKey: string) => void;
}

export function TierCard({ tierName, plans, isPremium = false, selectedPlanKey, onSelectPlan }: TierCardProps) {
  const features = isPremium ? PRO_FEATURES : BASIC_FEATURES;
  const isThisTierSelected = plans.some(p => p.plan_key === selectedPlanKey);
  const sortedPlans = [...plans].sort((a, b) => a.sortOrder - b.sortOrder);

  const getMonthlyPrice = (plan: PlanConfig) => {
    const months = Math.round(plan.durationDays / 30);
    if (months > 1) return Math.floor(plan.price / months);
    return plan.price;
  };

  return (
    <div
      className={`rounded-2xl border-2 transition-all overflow-hidden flex flex-col h-full relative ${
        isPremium
          ? isThisTierSelected
            ? 'border-amber-500 ring-2 ring-amber-500/30 bg-amber-500/5 shadow-lg'
            : 'border-amber-500/40 bg-amber-500/[0.02] shadow-md'
          : isThisTierSelected
            ? 'border-primary ring-2 ring-primary/20 bg-primary/5'
            : 'border-border bg-card'
      }`}
    >
      {/* Recommended badge for Pro */}
      {isPremium && (
        <div className="bg-amber-500 text-white text-center text-[11px] font-semibold py-1 tracking-wide">
          ✦ Recommended for Leaders
        </div>
      )}

      {/* Header */}
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-center gap-2 mb-3">
          {isPremium ? (
            <div className="h-8 w-8 rounded-lg bg-amber-500/15 flex items-center justify-center">
              <Gem className="h-4 w-4 text-amber-500" />
            </div>
          ) : (
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Crown className="h-4 w-4 text-primary" />
            </div>
          )}
          <h4 className="font-bold text-base text-foreground">{tierName}</h4>
        </div>

        {/* Features */}
        <div className="space-y-1.5">
          {features.map((feature, i) => (
            <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
              <Check className={`h-3.5 w-3.5 shrink-0 mt-0.5 ${isPremium ? 'text-amber-500' : 'text-primary'}`} />
              <span>{feature}</span>
            </div>
          ))}
          {!isPremium && BASIC_EXCLUDED_FEATURES.map((feature, i) => (
            <div key={`ex-${i}`} className="flex items-start gap-2 text-xs text-muted-foreground/40">
              <X className="h-3.5 w-3.5 shrink-0 mt-0.5 text-destructive/40" />
              <span className="line-through">{feature}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Divider */}
      <div className="mx-4 border-t border-border/60" />

      {/* Billing Options */}
      <div className="px-3 py-3 space-y-1.5 flex-1">
        <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider px-1 mb-2">
          Choose billing
        </p>
        {sortedPlans.map((plan) => {
          const isSelected = selectedPlanKey === plan.plan_key;
          const months = Math.round(plan.durationDays / 30);
          const monthlyPrice = getMonthlyPrice(plan);

          return (
            <button
              key={plan.plan_key}
              type="button"
              onClick={() => onSelectPlan(plan.plan_key)}
              className={`w-full flex items-center justify-between px-3 py-3 rounded-xl border transition-all text-left ${
                isSelected
                  ? isPremium
                    ? 'border-amber-500 bg-amber-500/10 shadow-sm'
                    : 'border-primary bg-primary/10 shadow-sm'
                  : 'border-border/50 bg-background hover:border-muted-foreground/30 hover:bg-muted/30'
              }`}
            >
              <div className="flex items-center gap-3">
                {/* Radio indicator */}
                <div
                  className={`h-[18px] w-[18px] rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                    isSelected
                      ? isPremium
                        ? 'border-amber-500'
                        : 'border-primary'
                      : 'border-muted-foreground/30'
                  }`}
                >
                  {isSelected && (
                    <div className={`h-2.5 w-2.5 rounded-full ${isPremium ? 'bg-amber-500' : 'bg-primary'}`} />
                  )}
                </div>
                <div>
                  <span className="text-sm font-medium text-foreground">{plan.displayName || plan.name}</span>
                  {plan.billing_type === 'recurring' && (
                    <span className="text-[10px] text-muted-foreground ml-1.5 bg-muted px-1 py-0.5 rounded">auto-renew</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {plan.badgeText && (
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center gap-0.5">
                    <Star className="h-2.5 w-2.5" />
                    {plan.badgeText}
                  </span>
                )}
                <div className="text-right">
                  <span className="text-sm font-bold text-foreground">₹{monthlyPrice}</span>
                  <span className="text-[10px] text-muted-foreground">/mo</span>
                  {months > 1 && (
                    <p className="text-[10px] text-muted-foreground">₹{plan.price} total</p>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
