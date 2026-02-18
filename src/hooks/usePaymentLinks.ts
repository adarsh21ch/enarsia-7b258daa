/**
 * Payment links for subscription plans.
 * Now reads dynamically from admin_subscription_plans table.
 */
import { useAdminConfig } from './useAdminConfig';

export type PlanType = string;

export interface PlanConfig {
  id: string;
  plan_key: string;
  name: string;
  price: number;
  paymentLink: string;
  billing_type: 'one_time' | 'recurring';
  razorpay_plan_id?: string | null;
  features: string[];
  description: string;
  durationDays: number;
  badgeText?: string | null;
  isDefault?: boolean;
  sortOrder: number;
  tier: 'basic' | 'pro' | 'premium';
}

// Legacy constants for backward compatibility (will be overridden by dynamic config)
export const PAYMENT_LINKS = {
  monthly: 'https://rzp.io/rzp/HhAdokE',
  pro_6_months: 'https://rzp.io/rzp/CPQRHdp',
} as const;

// Legacy config for fallback - updated to match current admin config
export const PLAN_CONFIG: Record<string, PlanConfig> = {
  pro_6_months: {
    id: 'pro_6_months',
    plan_key: 'pro_6_months',
    name: 'Pro 6-Month',
    price: 299,
    paymentLink: PAYMENT_LINKS.pro_6_months,
    billing_type: 'one_time',
    tier: 'pro',
    description: '6 Months Access – Best Value',
    durationDays: 180,
    badgeText: 'Best Value',
    isDefault: true,
    sortOrder: 1,
    features: [
      'Unlimited prospects',
      'Auto-sync from teammates',
      'View team member tracking',
      'Team actions & dashboards',
      'Switch tracking source',
    ],
  },
  monthly: {
    id: 'monthly',
    plan_key: 'monthly',
    name: 'Pro Monthly',
    price: 99,
    paymentLink: PAYMENT_LINKS.monthly,
    billing_type: 'one_time',
    tier: 'pro',
    description: '1 Month Access',
    durationDays: 30,
    sortOrder: 2,
    features: [
      'Unlimited prospects',
      'Manual personal tracking',
      'Manual team tracking (self-entered)',
      'Auto-calculated totals',
    ],
  },
};

export const FREE_LEAD_LIMIT = 200; // Updated to match admin config

export function usePaymentLinks() {
  const { config, loading } = useAdminConfig();

  // Transform admin plans to PlanConfig format
  const plans: PlanConfig[] = config.plans.map(plan => ({
    id: plan.id,
    plan_key: plan.plan_key,
    name: plan.plan_name,
    price: plan.price_inr,
    paymentLink: plan.payment_link || '',
    billing_type: plan.billing_type || 'one_time',
    razorpay_plan_id: plan.razorpay_plan_id,
    features: Array.isArray(plan.features) ? plan.features : [],
    description: plan.description || '',
    durationDays: plan.duration_days,
    badgeText: plan.badge_text,
    isDefault: plan.is_default,
    sortOrder: plan.sort_order || 0,
    tier: plan.tier || 'pro',
  }));

  // Get dynamic free lead limit from config
  const freeLeadLimit = config.limits.free_total_leads ?? FREE_LEAD_LIMIT;

  const openPaymentLink = (planKey: string) => {
    const plan = plans.find(p => p.plan_key === planKey);
    if (plan?.paymentLink) {
      window.location.href = plan.paymentLink;
    }
  };

  const getPlanByKey = (planKey: string): PlanConfig | undefined => {
    return plans.find(p => p.plan_key === planKey) || PLAN_CONFIG[planKey];
  };

  const getDefaultPlan = (): PlanConfig | undefined => {
    return plans.find(p => p.isDefault) || plans[0];
  };

  return {
    openPaymentLink,
    plans,
    getPlanByKey,
    getDefaultPlan,
    // Legacy exports for backward compatibility
    PLAN_CONFIG: plans.length > 0 
      ? Object.fromEntries(plans.map(p => [p.plan_key, p]))
      : PLAN_CONFIG,
    PAYMENT_LINKS: plans.length > 0
      ? Object.fromEntries(plans.map(p => [p.plan_key, p.paymentLink]))
      : PAYMENT_LINKS,
    FREE_LEAD_LIMIT: freeLeadLimit,
    loading,
  };
}
