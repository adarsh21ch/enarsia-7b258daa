import { Crown, Check, Star, Gem, X } from 'lucide-react';
import { PlanConfig } from '@/hooks/usePaymentLinks';
import { Badge } from '@/components/ui/badge';

const PRO_FEATURES = [
  'Full Application Access (Calling + Follow-up)',
  'TrackUp Dashboard (Advanced Tracking)',
  'Higher Limits & Productivity Tools',
  'Faster Workflow & Automation',
];

const PRO_EXCLUDED_FEATURES = [
  'Nevorai Funnels',
  'Funnel Video Insights',
  'Advanced Analytics',
  'Leader Tools',
];

const PREMIUM_FEATURES = [
  'Everything in Pro',
  'Nevorai Funnels',
  'Funnel Video Insights',
  'Advanced Analytics',
  'Leader Tools',
  'Premium Support',
];

interface TierCardProps {
  tierName: string;
  plans: PlanConfig[];
  isPremium?: boolean;
  selectedPlanKey: string;
  onSelectPlan: (planKey: string) => void;
}

export function TierCard({ tierName, plans, isPremium = false, selectedPlanKey, onSelectPlan }: TierCardProps) {
  const features = isPremium ? PREMIUM_FEATURES : PRO_FEATURES;
  const isThisTierSelected = plans.some(p => p.plan_key === selectedPlanKey);
  const sortedPlans = [...plans].sort((a, b) => a.sortOrder - b.sortOrder);

  const getMonthlyPrice = (plan: PlanConfig) => {
    const months = Math.round(plan.durationDays / 30);
    if (months > 1) return Math.floor(plan.price / months);
    return plan.price;
  };

  return (
    <div
      className={`rounded-xl border-2 transition-all overflow-hidden ${
        isPremium
          ? isThisTierSelected
            ? 'border-amber-500 bg-amber-500/5'
            : 'border-amber-500/30 bg-amber-500/[0.02]'
          : isThisTierSelected
            ? 'border-primary bg-primary/5'
            : 'border-border bg-card'
      }`}
    >
      {/* Header */}
      <div className={`px-4 pt-4 pb-3 relative ${isPremium ? '' : ''}`}>
        {isPremium && (
          <Badge className="absolute -top-0 right-3 bg-amber-500 text-white border-0 text-[10px] px-2 py-0.5 rounded-b-lg rounded-t-none">
            Recommended for Leaders
          </Badge>
        )}
        <div className="flex items-center gap-2 mb-2">
          {isPremium ? (
            <Gem className="h-5 w-5 text-amber-500" />
          ) : (
            <Crown className="h-5 w-5 text-primary" />
          )}
          <h4 className="font-bold text-base text-foreground">{tierName}</h4>
        </div>
        <div className="space-y-1">
          {features.map((feature, i) => (
            <div key={i} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Check className={`h-3 w-3 shrink-0 ${isPremium ? 'text-amber-500' : 'text-primary'}`} />
              <span>{feature}</span>
            </div>
          ))}
          {!isPremium && PRO_EXCLUDED_FEATURES.map((feature, i) => (
            <div key={`ex-${i}`} className="flex items-center gap-1.5 text-xs text-muted-foreground/50">
              <X className="h-3 w-3 shrink-0 text-destructive/50" />
              <span className="line-through">{feature}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Duration Options */}
      <div className="px-3 pb-3 space-y-2">
        {sortedPlans.map((plan) => {
          const isSelected = selectedPlanKey === plan.plan_key;
          const months = Math.round(plan.durationDays / 30);
          const monthlyPrice = getMonthlyPrice(plan);

          return (
            <button
              key={plan.plan_key}
              type="button"
              onClick={() => onSelectPlan(plan.plan_key)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg border transition-all text-left ${
                isSelected
                  ? isPremium
                    ? 'border-amber-500 bg-amber-500/10'
                    : 'border-primary bg-primary/10'
                  : 'border-border/50 bg-background hover:border-muted-foreground/30'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className={`h-4 w-4 rounded-full border-2 flex items-center justify-center ${
                    isSelected
                      ? isPremium
                        ? 'border-amber-500'
                        : 'border-primary'
                      : 'border-muted-foreground/40'
                  }`}
                >
                  {isSelected && (
                    <div className={`h-2 w-2 rounded-full ${isPremium ? 'bg-amber-500' : 'bg-primary'}`} />
                  )}
                </div>
                <div>
                  <span className="text-sm font-medium text-foreground">{plan.displayName || plan.name}</span>
                  {plan.billing_type === 'recurring' && (
                    <span className="text-[10px] text-muted-foreground ml-1.5">recurring</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {plan.badgeText && (
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-700 dark:text-amber-400 flex items-center gap-0.5">
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
