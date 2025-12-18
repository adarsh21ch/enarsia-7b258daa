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
    discountedAmount: 199900, // ₹1,999 in paise (with coupon)
    duration_days: 365,
    description: 'NevorAI Pro Yearly – ₹2,999 / year',
    discountedDescription: 'NevorAI Pro Yearly – ₹1,999 / year',
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
    const hasCoupon = planType === 'yearly' && couponCode;
    
    const planConfig = PLAN_CONFIG[planType];
    const description = planType === 'yearly' && hasCoupon 
      ? PLAN_CONFIG.yearly.discountedDescription 
      : planConfig.description;

    setLoading(true);

    try {
      // Load Razorpay script
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        throw new Error('Failed to load payment gateway');
      }

      // Create order via edge function (includes user_email in notes for webhook)
      const { data, error } = await supabase.functions.invoke('create-razorpay-order', {
        body: {
          user_id: user.id,
          user_email: user.email,
          plan_type: planType,
          coupon_code: couponCode,
        },
      });

      // Handle error response from edge function
      if (error) {
        console.error('Order creation error:', error);
        throw new Error(error.message || 'Failed to create payment order');
      }

      // Check if the response contains an error (e.g., coupon limit reached)
      if (data?.error) {
        throw new Error(data.error);
      }

      if (!data?.order_id) {
        throw new Error('Failed to create payment order');
      }

      const { order_id, amount, currency, key_id } = data;

      // Open Razorpay checkout with handler callback
      const razorpayOptions = {
        key: key_id,
        amount: amount,
        currency: currency,
        name: 'NevorAI',
        description: description,
        order_id: order_id,
        prefill: {
          email: user.email,
        },
        theme: {
          color: '#3b82f6',
        },
        // Handler callback when payment succeeds
        handler: function(response: any) {
          console.log('Payment successful, redirecting...', response);
          // Navigate to success page with payment params
          const params = new URLSearchParams({
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_order_id: response.razorpay_order_id,
            razorpay_signature: response.razorpay_signature,
          });
          window.location.href = `${window.location.origin}/payment-success?${params.toString()}`;
        },
        modal: {
          ondismiss: () => {
            setLoading(false);
          },
        },
      };

      const razorpay = new window.Razorpay(razorpayOptions);
      razorpay.on('payment.failed', (response: any) => {
        console.error('Payment failed:', response.error);
        toast({
          title: "Payment Failed",
          description: response.error?.description || "Something went wrong. Please try again.",
          variant: "destructive",
        });
        options?.onError?.(response.error?.description);
        setLoading(false);
      });

      razorpay.open();
    } catch (err: any) {
      console.error('Payment initiation error:', err);
      toast({
        title: "Payment Error",
        description: err.message || "Could not initiate payment. Please try again.",
        variant: "destructive",
      });
      options?.onError?.(err.message);
      setLoading(false);
    }
  }, [user, loadRazorpayScript, toast]);

  return { initiatePayment, loading };
}