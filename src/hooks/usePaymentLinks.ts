/**
 * Payment links for subscription plans.
 * These are pre-created Razorpay payment links.
 */

export type PlanType = 'mini' | 'pro';

export interface PlanConfig {
  name: string;
  price: number;
  paymentLink: string;
  features: string[];
  description: string;
}

export const PAYMENT_LINKS = {
  mini: 'https://rzp.io/rzp/HhAdokE',
  pro: 'https://rzp.io/rzp/CPQRHdp',
} as const;

export const PLAN_CONFIG: Record<PlanType, PlanConfig> = {
  mini: {
    name: 'Monthly Plan',
    price: 99,
    paymentLink: PAYMENT_LINKS.mini,
    description: '1 Month Access',
    features: [
      'Manual personal tracking',
      'Manual team tracking (self-entered)',
      'Auto-calculated totals',
    ],
  },
  pro: {
    name: '4-Month Plan',
    price: 299,
    paymentLink: PAYMENT_LINKS.pro,
    description: '4 Months Access – Best Value',
    features: [
      'Everything in Monthly Plan',
      'Auto-sync from teammates',
      'View team member tracking',
      'Team actions & dashboards',
      'Switch tracking source',
      'Frontline team gets access FREE',
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
