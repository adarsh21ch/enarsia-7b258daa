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

    // TEST MODE: Use ₹1 test payment link for all plans
    // After testing, replace with actual payment links
    const TEST_PAYMENT_LINK = 'https://rzp.io/rzp/xXwL6YP';
    
    // Redirect to the payment page (same window)
    window.location.href = TEST_PAYMENT_LINK;
  }, [user, toast]);

  return { initiatePayment, loading };
}
