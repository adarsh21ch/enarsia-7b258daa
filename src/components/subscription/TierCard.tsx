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
  const sortedPlans = [...plans].sort((a, b) => a.sortOrder - b.sortOrder);

  const getDailyPrice = (plan: PlanConfig) => Math.round(plan.price / plan.durationDays);
  const lowestDailyPrice = Math.min(...sortedPlans.map(p => Math.round(p.price / p.durationDays)));

  const defaultFeatures = [
    'Full Application Access (Calling + Follow-up)',
    'Team Tracking Dashboard (Advanced Tracking)',
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
    if (months === 1) return '/month';
    if (months === 6) return '/6 months';
    if (months === 12) return '/year';
    return `/${months} months`;
  };

  return (
    <div className="rounded-2xl border border-[hsl(36,80%,80%)] dark:border-[hsl(36,50%,30%)] bg-card overflow-hidden">
      {/* Light premium header */}
      <div className="bg-gradient-to-r from-[hsl(36,85%,62%)] to-[hsl(28,80%,56%)] px-4 py-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Crown className="h-4 w-4 text-white" />
            <h4 className="font-bold text-sm text-white tracking-wide">{tierName}</h4>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-lg font-extrabold text-white">₹{sortedPlans[0]?.price ?? ''}</span>
            <span className="text-xs text-white/80 font-medium">{getBillingLabel(sortedPlans[0])}</span>
          </div>
        </div>
      </div>

      {/* Features */}
      <div className={`px-4 ${compact ? 'pt-2.5 pb-2' : 'pt-3.5 pb-3'}`}>
        <div className={`${compact ? 'space-y-1.5' : 'space-y-2'}`}>
          {features.slice(0, compact ? 4 : 5).map((f, i) => (
            <div key={i} className="flex items-start gap-2.5 text-[12.5px] text-foreground/85">
              <Check className="h-4 w-4 text-[hsl(36,80%,50%)] dark:text-[hsl(36,80%,60%)] shrink-0 mt-0.5" strokeWidth={2.5} />
              <span>{f}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Billing options */}
      <div className={`px-3 ${compact ? 'pb-3' : 'pb-3.5'}`}>
        <div className={`grid gap-2 ${sortedPlans.length <= 3 ? `grid-cols-${sortedPlans.length}` : 'grid-cols-3'}`}>
          {sortedPlans.map((plan) => {
            const isSelected = selectedPlanKey === plan.plan_key;
            const dailyPrice = getDailyPrice(plan);
            const renewal = plan.renewalPrice ?? plan.price;
            const first = plan.firstMonthPrice ?? null;
            const hasIntro = typeof first === 'number' && first > 0 && first < renewal;
            const introBadge = plan.offerBadgeText || plan.badgeText;

            return (
              <button
                key={plan.plan_key}
                type="button"
                onClick={() => onSelectPlan(plan.plan_key)}
                className={`relative flex flex-col items-center px-2 py-3 rounded-xl border transition-all text-center ${
                  isSelected
                    ? 'border-[hsl(36,80%,55%)] bg-[hsl(36,85%,96%)] dark:bg-[hsl(36,40%,15%)] shadow-sm'
                    : 'border-border/50 bg-muted/20 hover:border-[hsl(36,70%,70%)] hover:bg-muted/30'
                }`}
              >
                {introBadge && (
                  <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-[8px] font-bold px-2 py-0.5 rounded-full bg-[hsl(36,80%,55%)] text-white uppercase tracking-wider whitespace-nowrap">
                    {introBadge}
                  </span>
                )}
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider leading-tight">
                  {getDurationLabel(plan)}
                </span>
                <span className={`text-base font-extrabold leading-tight mt-1 ${
                  isSelected ? 'text-[hsl(36,75%,40%)] dark:text-[hsl(36,80%,65%)]' : 'text-foreground'
                }`}>
                  ₹{hasIntro ? first : plan.price}{getBillingLabel(plan)}
                </span>
                {hasIntro ? (
                  <span className="text-[9px] text-muted-foreground mt-0.5 leading-tight">
                    then ₹{renewal}{getBillingLabel(plan)}
                  </span>
                ) : (
                  <span className="text-[9px] text-muted-foreground mt-0.5 leading-tight">
                    ₹{dailyPrice}/day
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
