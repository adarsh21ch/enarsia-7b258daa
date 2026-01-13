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
  mini: 'https://rzp.io/rzp/SKlPxwfs',
  pro: 'https://rzp.io/rzp/07CdWzrZ',
} as const;

export const PLAN_CONFIG: Record<PlanType, PlanConfig> = {
  mini: {
    name: 'TrackUp Mini',
    price: 29,
    paymentLink: PAYMENT_LINKS.mini,
    description: 'Manual personal & team tracking',
    features: [
      'Manual personal tracking',
      'Manual team tracking (self-entered)',
      'Auto-calculated totals',
    ],
  },
  pro: {
    name: 'NeverAI Pro',
    price: 299,
    paymentLink: PAYMENT_LINKS.pro,
    description: 'Full team sync & analytics',
    features: [
      'Everything in Mini',
      'Auto-sync from teammates',
      'View team member tracking',
      'Team actions & dashboards',
      'Switch tracking source',
      'Frontline team gets Mini FREE',
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
