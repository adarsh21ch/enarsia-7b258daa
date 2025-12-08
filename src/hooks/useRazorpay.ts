import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

declare global {
  interface Window {
    Razorpay: any;
  }
}

export type PlanType = 'monthly' | 'yearly';

interface RazorpayOptions {
  planType?: PlanType;
  couponCode?: string;
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

const PLAN_CONFIG = {
  monthly: {
    amount: 24900, // ₹249 in paise
    duration_days: 30,
    description: 'NevorAI Pro Monthly – ₹249 / month',
  },
  yearly: {
    amount: 299900, // ₹2,999 in paise
    discountedAmount: 199900, // ₹1,999 in paise (with ACHIEVERS1000)
    duration_days: 365,
    description: 'NevorAI Pro Yearly – ₹2,999 / year',
    discountedDescription: 'NevorAI Pro Yearly – ₹1,999 / year (Achievers Club)',
  },
};

export function useRazorpay() {
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const loadRazorpayScript = useCallback((): Promise<boolean> => {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  }, []);

  const initiatePayment = useCallback(async (options?: RazorpayOptions) => {
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

    setLoading(true);

    try {
      // Use static payment links for all plans
      let paymentLink: string;
      
      if (planType === 'monthly') {
        // Monthly plan - static link
        paymentLink = 'https://rzp.io/rzp/iQIz9kH';
      } else if (planType === 'yearly') {
        // Yearly plan - different links based on coupon
        paymentLink = hasCoupon 
          ? 'https://rzp.io/rzp/5s1VsH26'  // Achievers Club discounted link
          : 'https://rzp.io/rzp/PUPxlHdU'; // Standard yearly link
      } else {
        throw new Error('Invalid plan type');
      }

      // Open the static payment link
      window.open(paymentLink, '_blank');
      
      toast({
        title: "Payment Page Opened",
        description: "Complete your payment in the new tab. Your Pro status will activate automatically.",
      });
    } catch (err: any) {
      console.error('Payment initiation error:', err);
      toast({
        title: "Payment Error",
        description: err.message || "Could not initiate payment. Please try again.",
        variant: "destructive",
      });
      options?.onError?.(err.message);
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  return { initiatePayment, loading };
}
