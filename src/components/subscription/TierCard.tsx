import { Crown, Check, Gem, X } from 'lucide-react';
import { PlanConfig } from '@/hooks/usePaymentLinks';

const BASIC_FEATURES = [
  'Full App Access',
  'TrackUp Dashboard',
  'Higher Limits',
];

const BASIC_EXCLUDED = [
  'Funnels & Analytics',
  'Leader Tools',
];

const PRO_FEATURES = [
  'Everything in Basic',
  'Nevorai Funnels',
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
  compact?: boolean;
}

export function TierCard({ tierName, plans, isPremium = false, selectedPlanKey, onSelectPlan, compact = false }: TierCardProps) {
  const features = isPremium ? PRO_FEATURES : BASIC_FEATURES;
  const isThisTierSelected = plans.some(p => p.plan_key === selectedPlanKey);
  const sortedPlans = [...plans].sort((a, b) => a.sortOrder - b.sortOrder);

  const getDailyPrice = (plan: PlanConfig) => {
    return Math.ceil(plan.price / plan.durationDays);
  };

  const getDurationLabel = (plan: PlanConfig) => {
    const months = Math.round(plan.durationDays / 30);
    if (months === 1) return '1 Month';
    if (months === 6) return '6 Months';
    if (months === 12) return '1 Year';
    return `${months} Mo`;
  };

  const getBillingLabel = (plan: PlanConfig) => {
    const months = Math.round(plan.durationDays / 30);
    if (months === 1) return 'billed monthly';
    if (months === 6) return 'billed every 6 months';
    if (months === 12) return 'billed yearly';
    return `billed every ${months} months`;
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
      {/* Recommended badge */}
      {isPremium && (
        <div className="bg-amber-500 text-white text-center text-[10px] font-semibold py-0.5 tracking-wide">
          ✦ Recommended
        </div>
      )}

      {/* Header + Features */}
      <div className={`px-3 ${compact ? 'pt-2 pb-1.5' : 'pt-3 pb-2'}`}>
        <div className="flex items-center gap-2 mb-1.5">
          {isPremium ? (
            <div className="h-6 w-6 rounded-md bg-amber-500/15 flex items-center justify-center">
              <Gem className="h-3 w-3 text-amber-500" />
            </div>
          ) : (
            <div className="h-6 w-6 rounded-md bg-primary/10 flex items-center justify-center">
              <Crown className="h-3 w-3 text-primary" />
            </div>
          )}
          <h4 className="font-bold text-sm text-foreground">{tierName}</h4>
        </div>

        <div className={`${compact ? 'space-y-0.5' : 'space-y-1'}`}>
          {features.map((f, i) => (
            <div key={i} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <Check className={`h-3 w-3 shrink-0 ${isPremium ? 'text-amber-500' : 'text-primary'}`} />
              <span>{f}</span>
            </div>
          ))}
          {!isPremium && BASIC_EXCLUDED.map((f, i) => (
            <div key={`ex-${i}`} className="flex items-center gap-1.5 text-[11px] text-muted-foreground/40">
              <X className="h-3 w-3 shrink-0 text-destructive/40" />
              <span className="line-through">{f}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Divider */}
      <div className="mx-3 border-t border-border/60" />

      {/* Billing options as compact grid */}
      <div className={`px-2 ${compact ? 'py-1.5' : 'py-2'} flex-1`}>
        <div className={`grid gap-1.5 ${sortedPlans.length <= 3 ? `grid-cols-${sortedPlans.length}` : 'grid-cols-3'}`}>
          {sortedPlans.map((plan) => {
            const isSelected = selectedPlanKey === plan.plan_key;
            const months = Math.round(plan.durationDays / 30);
            const monthlyPrice = getMonthlyPrice(plan);

            return (
              <button
                key={plan.plan_key}
                type="button"
                onClick={() => onSelectPlan(plan.plan_key)}
                className={`flex flex-col items-center px-1.5 py-2 rounded-xl border transition-all text-center ${
                  isSelected
                    ? isPremium
                      ? 'border-amber-500 bg-amber-500/10 shadow-sm'
                      : 'border-primary bg-primary/10 shadow-sm'
                    : 'border-border/50 bg-background hover:border-muted-foreground/30'
                }`}
              >
                <span className="text-[10px] font-medium text-muted-foreground leading-tight">
                  {getDurationLabel(plan)}
                </span>
                <span className="text-base font-bold text-foreground leading-tight mt-0.5">
                  ₹{monthlyPrice}
                </span>
                <span className="text-[9px] text-muted-foreground">/mo</span>
                {months > 1 && (
                  <span className="text-[9px] text-muted-foreground mt-0.5">₹{plan.price} total</span>
                )}
                {plan.badgeText && (
                  <span className={`text-[8px] font-semibold mt-1 px-1.5 py-0.5 rounded-full ${
                    isPremium ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400' : 'bg-primary/10 text-primary'
                  }`}>
                    {plan.badgeText}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
