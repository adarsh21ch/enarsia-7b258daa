import { Crown, Check } from 'lucide-react';
import { PlanConfig } from '@/hooks/usePaymentLinks';

interface TierCardProps {
  tierName?: string;
  plans: PlanConfig[];
  isPremium?: boolean;
  selectedPlanKey: string;
  onSelectPlan: (planKey: string) => void;
  compact?: boolean;
}

export function TierCard({ tierName = 'Pro', plans, selectedPlanKey, onSelectPlan, compact = false }: TierCardProps) {
  const isThisTierSelected = plans.some(p => p.plan_key === selectedPlanKey);
  const sortedPlans = [...plans].sort((a, b) => a.sortOrder - b.sortOrder);

  const getDailyPrice = (plan: PlanConfig) => Math.round(plan.price / plan.durationDays);
  const lowestDailyPrice = Math.min(...sortedPlans.map(p => Math.round(p.price / p.durationDays)));

  const defaultFeatures = [
    'Full Application Access (Calling + Follow-up)',
    'TrackUp Dashboard (Advanced Tracking)',
    'Higher Limits & Productivity Tools',
    'Faster Workflow & Automation',
    'Best for individual network marketers.',
  ];

  const features = sortedPlans[0]?.features?.length ? sortedPlans[0].features : defaultFeatures;

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
        isThisTierSelected
          ? 'border-amber-500 ring-2 ring-amber-500/20 bg-amber-50 dark:bg-amber-950/20 shadow-lg'
          : 'border-amber-300 dark:border-amber-700 bg-card'
      }`}
    >
      {/* Header + Features */}
      <div className={`px-3 ${compact ? 'pt-2 pb-1.5' : 'pt-3 pb-2'}`}>
        <div className="flex items-center gap-2 mb-1.5">
          <div className="h-6 w-6 rounded-md bg-amber-500/15 flex items-center justify-center">
            <Crown className="h-3 w-3 text-amber-600 dark:text-amber-400" />
          </div>
          <h4 className="font-bold text-sm text-foreground flex-1">{tierName}</h4>
          <span className="text-sm font-bold text-amber-600 dark:text-amber-400">
            ₹{lowestDailyPrice}/day
          </span>
        </div>

        <div className={`${compact ? 'space-y-0.5' : 'space-y-1'}`}>
          {features.slice(0, compact ? 4 : 6).map((f, i) => (
            <div key={i} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <Check className="h-3 w-3 shrink-0 text-amber-600 dark:text-amber-400" />
              <span>{f}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Divider */}
      <div className="mx-3 border-t border-amber-200 dark:border-amber-800/50" />

      {/* Billing options as compact grid */}
      <div className={`px-2 ${compact ? 'py-1.5' : 'py-2'} flex-1`}>
        <div className={`grid gap-1.5 ${sortedPlans.length <= 3 ? `grid-cols-${sortedPlans.length}` : 'grid-cols-3'}`}>
          {sortedPlans.map((plan) => {
            const isSelected = selectedPlanKey === plan.plan_key;
            const dailyPrice = getDailyPrice(plan);

            return (
              <button
                key={plan.plan_key}
                type="button"
                onClick={() => onSelectPlan(plan.plan_key)}
                className={`flex flex-col items-center px-1.5 py-2.5 rounded-xl border transition-all text-center ${
                  isSelected
                    ? 'border-amber-500 bg-amber-100 dark:bg-amber-900/30 shadow-sm'
                    : 'border-border/50 bg-background hover:border-amber-400/50'
                }`}
              >
                <span className="text-[10px] font-medium text-muted-foreground leading-tight">
                  {getDurationLabel(plan)}
                </span>
                <span className="text-sm font-bold leading-tight mt-1 text-amber-600 dark:text-amber-400">
                  ₹{dailyPrice}/day
                </span>
                <span className="text-[9px] text-muted-foreground mt-0.5 leading-tight">
                  ₹{plan.price} {getBillingLabel(plan)}
                </span>
                {plan.badgeText && (
                  <span className="text-[8px] font-semibold mt-1 px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300">
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
