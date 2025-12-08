import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PLAN_CONFIG = {
  monthly: {
    amount: 24900,
    duration_days: 30,
  },
  yearly: {
    amount: 299900,
    discountedAmount: 199900,
    duration_days: 365,
  },
};

async function verifySignature(orderId: string, paymentId: string, signature: string, secret: string): Promise<boolean> {
  const body = `${orderId}|${paymentId}`;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signatureBytes = await crypto.subtle.sign('HMAC', key, encoder.encode(body));
  const expectedSignature = Array.from(new Uint8Array(signatureBytes))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  
  return expectedSignature === signature;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const RAZORPAY_KEY_ID = Deno.env.get('RAZORPAY_KEY_ID');
    const RAZORPAY_KEY_SECRET = Deno.env.get('RAZORPAY_KEY_SECRET');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!RAZORPAY_KEY_SECRET) {
      console.error('Missing Razorpay secret');
      return new Response(
        JSON.stringify({ error: 'Payment service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, user_id } = await req.json();

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !user_id) {
      console.error('Missing required parameters');
      return new Response(
        JSON.stringify({ error: 'Missing payment verification parameters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Verifying payment for user: ${user_id}, payment_id: ${razorpay_payment_id}`);

    // Verify the signature
    const isValid = await verifySignature(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      RAZORPAY_KEY_SECRET
    );

    if (!isValid) {
      console.error('Invalid payment signature');
      return new Response(
        JSON.stringify({ error: 'Payment verification failed - invalid signature' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Signature verified successfully');

    // Fetch order details from Razorpay to get the plan type and amount
    const authHeader = btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`);
    let planType = 'monthly';
    let durationDays = 30;
    let amount = 24900;
    let couponApplied = 'none';

    try {
      const orderResponse = await fetch(`https://api.razorpay.com/v1/orders/${razorpay_order_id}`, {
        headers: {
          'Authorization': `Basic ${authHeader}`,
        },
      });
      
      if (orderResponse.ok) {
        const orderDetails = await orderResponse.json();
        const orderPlanType = orderDetails.notes?.plan_type;
        const orderDurationDays = orderDetails.notes?.duration_days;
        const orderCoupon = orderDetails.notes?.coupon_applied;
        const orderAmount = orderDetails.notes?.final_amount;
        
        if (orderPlanType && PLAN_CONFIG[orderPlanType as keyof typeof PLAN_CONFIG]) {
          planType = orderPlanType;
          durationDays = parseInt(orderDurationDays) || PLAN_CONFIG[planType as keyof typeof PLAN_CONFIG].duration_days;
          amount = parseInt(orderAmount) || orderDetails.amount;
          couponApplied = orderCoupon || 'none';
        }
        console.log(`Order details: plan_type=${planType}, duration_days=${durationDays}, amount=${amount}, coupon=${couponApplied}`);
      }
    } catch (orderError) {
      console.error('Error fetching order details, defaulting to monthly:', orderError);
    }

    // Create Supabase client with service role
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Activate Pro subscription
    const now = new Date();
    const expiresAt = new Date(now);
    expiresAt.setDate(expiresAt.getDate() + durationDays);

    const { error: updateError } = await supabase
      .from('user_subscriptions')
      .update({
        plan: 'pro',
        status: 'active',
        subscribed_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
        payment_id: razorpay_payment_id,
      })
      .eq('user_id', user_id);

    if (updateError) {
      console.error('Error updating subscription:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to activate subscription' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Pro subscription activated for user: ${user_id}, plan: ${planType}, expires: ${expiresAt.toISOString()}`);

    // Log the payment
    await supabase.from('payments_log').insert({
      event_type: 'payment_verified',
      user_id: user_id,
      razorpay_payment_id: razorpay_payment_id,
      amount: amount,
      status: 'success',
      found_user: true,
      action_taken: `subscription_activated_${planType}${couponApplied !== 'none' ? `_coupon_${couponApplied}` : ''}`,
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Pro subscription activated successfully',
        plan_type: planType,
        duration_days: durationDays,
        coupon_applied: couponApplied,
        expires_at: expiresAt.toISOString()
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error verifying payment:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
