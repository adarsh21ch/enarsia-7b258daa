/**
 * Payment links for subscription plans.
 * Both plans grant Pro access with different durations.
 */

export type PlanType = 'monthly' | 'quarterly';

export interface PlanConfig {
  name: string;
  price: number;
  paymentLink: string;
  features: string[];
  description: string;
  durationDays: number;
}

export const PAYMENT_LINKS = {
  monthly: 'https://rzp.io/rzp/HhAdokE',
  quarterly: 'https://rzp.io/rzp/CPQRHdp',
} as const;

export const PLAN_CONFIG: Record<PlanType, PlanConfig> = {
  quarterly: {
    name: 'Pro 4-Month',
    price: 299,
    paymentLink: PAYMENT_LINKS.quarterly,
    description: '4 Months Access – Best Value',
    durationDays: 120,
    features: [
      'Unlimited prospects',
      'Auto-sync from teammates',
      'View team member tracking',
      'Team actions & dashboards',
      'Switch tracking source',
      'Frontline team gets access FREE',
    ],
  },
  monthly: {
    name: 'Pro Monthly',
    price: 99,
    paymentLink: PAYMENT_LINKS.monthly,
    description: '1 Month Access',
    durationDays: 30,
    features: [
      'Unlimited prospects',
      'Manual personal tracking',
      'Manual team tracking (self-entered)',
      'Auto-calculated totals',
    ],
  },
};

export const FREE_LEAD_LIMIT = 500;

export function usePaymentLinks() {
  const openPaymentLink = (plan: PlanType) => {
    const link = PAYMENT_LINKS[plan];
    // Open in same tab - Razorpay will redirect back after payment
    window.location.href = link;
  };

  return {
    openPaymentLink,
    PLAN_CONFIG,
    PAYMENT_LINKS,
    FREE_LEAD_LIMIT,
  };
}
