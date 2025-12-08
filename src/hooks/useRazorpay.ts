import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

declare global {
  interface Window {
    Razorpay: any;
  }
}

interface RazorpayOptions {
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

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

    setLoading(true);

    try {
      // Load Razorpay script
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        throw new Error('Failed to load payment gateway');
      }

      // Create order via edge function
      const { data, error } = await supabase.functions.invoke('create-razorpay-order', {
        body: {
          user_id: user.id,
          user_email: user.email,
        },
      });

      if (error || !data) {
        console.error('Order creation error:', error);
        throw new Error(error?.message || 'Failed to create payment order');
      }

      const { order_id, amount, currency, key_id } = data;

      // Build callback URL for redirect after payment
      const callbackUrl = `${window.location.origin}/payment-success`;

      // Open Razorpay checkout with redirect
      const razorpayOptions = {
        key: key_id,
        amount: amount,
        currency: currency,
        name: 'NevorAI',
        description: 'Pro Plan - 30 Days',
        order_id: order_id,
        prefill: {
          email: user.email,
        },
        theme: {
          color: '#3b82f6',
        },
        callback_url: callbackUrl,
        redirect: true,
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
    } finally {
      setLoading(false);
    }
  }, [user, loadRazorpayScript, toast]);

  return { initiatePayment, loading };
}
