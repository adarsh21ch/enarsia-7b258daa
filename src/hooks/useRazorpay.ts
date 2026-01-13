import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

declare global {
  interface Window {
    Razorpay: any;
  }
}

export type PlanType = 'mini' | 'pro';

interface RazorpayOptions {
  planType?: PlanType;
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

// Toggle this flag for testing (set to false for production)
const TEST_MODE = true;

const PLAN_CONFIG = {
  mini: {
    amount: TEST_MODE ? 100 : 2900, // ₹1 test or ₹29 production (in paise)
    duration_days: 30,
    description: TEST_MODE ? 'TrackUp Mini – ₹1 (TEST)' : 'TrackUp Mini – ₹29 / month',
  },
  pro: {
    amount: TEST_MODE ? 100 : 29900, // ₹1 test or ₹299 production (in paise)
    duration_days: 30,
    description: TEST_MODE ? 'NeverAI Pro – ₹1 (TEST)' : 'NeverAI Pro – ₹299 / month',
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
        description: "Please login to upgrade.",
        variant: "destructive",
      });
      return;
    }

    const planType = options?.planType || 'pro';
    const planConfig = PLAN_CONFIG[planType];
    const description = planConfig.description;

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