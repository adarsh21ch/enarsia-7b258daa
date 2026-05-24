/**
 * Single source of truth for rendering pricing/offer copy from an admin plan row.
 * Frontend code MUST NOT hardcode prices, offers, or trial copy — call these helpers
 * with the plan row coming from `admin_subscription_plans`.
 */
import type { SubscriptionPlan } from '@/hooks/useAdminConfig';

export const rupee = (n: number | null | undefined) =>
  typeof n === 'number' && Number.isFinite(n) ? `₹${n.toLocaleString('en-IN')}` : '';

export function cycleSuffix(plan: Pick<SubscriptionPlan, 'billing_cycle' | 'duration_days'>): string {
  const cycle = plan.billing_cycle;
  if (cycle === 'monthly') return '/month';
  if (cycle === 'yearly') return '/year';
  if (cycle === 'one_time') return '';
  const days = plan.duration_days ?? 0;
  const months = Math.round(days / 30);
  if (months === 1) return '/month';
  if (months === 12) return '/year';
  if (months > 0) return `/${months} months`;
  return '';
}

export interface PlanPricingView {
  hasIntroOffer: boolean;
  /** Primary price line, e.g. "₹59 for first month" or "₹149/month" */
  primary: string;
  /** Secondary renewal line, only present when intro offer is active */
  secondary?: string;
  /** Headline price (numeric) shown on CTA button */
  ctaAmount: number;
  /** "Launch Offer" / "Best Value" — from admin field */
  badge?: string | null;
  /** Whether plan is flagged most popular */
  popular: boolean;
  /** Savings highlight line from admin */
  savings?: string | null;
  /** Should the "Cancel anytime" footer be shown */
  cancelAnytime: boolean;
  trialDays: number;
}

export function getPlanPricingView(plan: SubscriptionPlan): PlanPricingView {
  const renewal = plan.renewal_price_inr ?? plan.price_inr;
  const first = plan.first_month_price_inr ?? null;
  const hasIntro =
    typeof first === 'number' && first > 0 && first < (renewal ?? 0);

  const suffix = cycleSuffix(plan);

  return {
    hasIntroOffer: hasIntro,
    primary: hasIntro
      ? `${rupee(first)} for first month`
      : `${rupee(renewal)}${suffix}`,
    secondary: hasIntro ? `Then renews at ${rupee(renewal)}${suffix}` : undefined,
    ctaAmount: hasIntro ? (first as number) : renewal,
    badge: plan.offer_badge_text || plan.badge_text || null,
    popular: !!plan.is_popular,
    savings: plan.highlight_savings_text || null,
    cancelAnytime: plan.cancel_anytime !== false,
    trialDays: plan.trial_days ?? 0,
  };
}
