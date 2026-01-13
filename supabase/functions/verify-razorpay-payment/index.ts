import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Simple in-memory rate limiter
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 10; // 10 requests per minute per user

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(userId);
  
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  
  if (entry.count >= RATE_LIMIT_MAX_REQUESTS) {
    console.warn(`Rate limit exceeded for user: ${userId}`);
    return false;
  }
  
  entry.count++;
  return true;
}

const PLAN_CONFIG = {
  mini: {
    amount: 9900,
    duration_days: 30,
    plan_name: 'mini',
  },
  pro: {
    amount: 29900,
    duration_days: 30,
    plan_name: 'pro',
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

    // Rate limiting check
    if (!checkRateLimit(user_id)) {
      return new Response(
        JSON.stringify({ error: 'Too many requests. Please wait a moment before trying again.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Verifying payment for user: ${user_id}, payment_id: ${razorpay_payment_id}`);

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

    const authHeader = btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`);
    let purchasedPlan: 'mini' | 'pro' = 'pro'; // Default to pro
    let durationDays = 30;
    let amount = 29900;

    try {
      const orderResponse = await fetch(`https://api.razorpay.com/v1/orders/${razorpay_order_id}`, {
        headers: {
          'Authorization': `Basic ${authHeader}`,
        },
      });
      
      if (orderResponse.ok) {
        const orderDetails = await orderResponse.json();
        const orderPlan = orderDetails.notes?.plan;
        const orderDurationDays = orderDetails.notes?.duration_days;
        const orderAmount = orderDetails.notes?.final_amount;
        
        // Use plan from order notes (set during order creation)
        if (orderPlan === 'mini' || orderPlan === 'pro') {
          purchasedPlan = orderPlan;
          durationDays = parseInt(orderDurationDays) || PLAN_CONFIG[purchasedPlan].duration_days;
          amount = parseInt(orderAmount) || orderDetails.amount;
        }
        console.log(`Order details: plan=${purchasedPlan}, duration_days=${durationDays}, amount=${amount}`);
      }
    } catch (orderError) {
      console.error('Error fetching order details, defaulting to pro:', orderError);
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    const now = new Date();
    const expiresAt = new Date(now);
    expiresAt.setDate(expiresAt.getDate() + durationDays);

    const { error: updateError } = await supabase
      .from('user_subscriptions')
      .update({
        plan: purchasedPlan, // Use actual purchased plan (mini or pro)
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

    console.log(`${purchasedPlan} subscription activated for user: ${user_id}, expires: ${expiresAt.toISOString()}`);

    await supabase.from('payments_log').insert({
      event_type: 'payment_verified',
      user_id: user_id,
      razorpay_payment_id: razorpay_payment_id,
      amount: amount,
      status: 'success',
      found_user: true,
      action_taken: `subscription_activated_${purchasedPlan}`,
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `${purchasedPlan === 'pro' ? 'Pro' : 'Mini'} subscription activated successfully`,
        plan: purchasedPlan,
        duration_days: durationDays,
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
