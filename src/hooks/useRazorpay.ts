import { useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export type PlanType = 'monthly' | 'yearly';

interface RazorpayOptions {
  planType?: PlanType;
  couponCode?: string;
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

// Static payment links for each plan
const PAYMENT_LINKS = {
  monthly: 'https://rzp.io/rzp/XgaOULf',           // ₹249
  yearly: 'https://rzp.io/rzp/uRssDrE',            // ₹2999
  yearlyDiscounted: 'https://rzp.io/rzp/RTVSZpno', // ₹1999 (Achievers Club)
};

export function useRazorpay() {
  const { user } = useAuth();
  const { toast } = useToast();

  const initiatePayment = useCallback((options?: RazorpayOptions) => {
    if (!user) {
      toast({
        title: "Login Required",
        description: "Please login to upgrade to Pro.",
        variant: "destructive",
      });
      return;
    }

    const planType = options?.planType || 'monthly';
    const couponCode = options?.couponCode;
    const hasCoupon = planType === 'yearly' && couponCode === 'ACHIEVERS1000';

    // Determine which link to use
    let paymentUrl: string;
    if (planType === 'monthly') {
      paymentUrl = PAYMENT_LINKS.monthly;
    } else if (hasCoupon) {
      paymentUrl = PAYMENT_LINKS.yearlyDiscounted;
    } else {
      paymentUrl = PAYMENT_LINKS.yearly;
    }

    // Open payment link in new tab
    window.open(paymentUrl, '_blank');
  }, [user, toast]);

  return { initiatePayment, loading: false };
}
