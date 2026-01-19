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

// IMPORTANT: Both payment amounts grant PRO access, only duration differs
// ₹99 (9900 paise) = Pro 1 month, ₹299 (29900 paise) = Pro 4 months
const PLAN_CONFIG = {
  '9900': { // ₹99
    duration_days: 30,
    plan_name: 'pro',
  },
  '29900': { // ₹299
    duration_days: 120,
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
    let durationDays = 30; // Default
    let amount = 9900;

    try {
      const orderResponse = await fetch(`https://api.razorpay.com/v1/orders/${razorpay_order_id}`, {
        headers: {
          'Authorization': `Basic ${authHeader}`,
        },
      });
      
      if (orderResponse.ok) {
        const orderDetails = await orderResponse.json();
        const orderDurationDays = orderDetails.notes?.duration_days;
        const orderAmount = orderDetails.notes?.final_amount;
        
        // Get duration from order notes
        if (orderDurationDays) {
          durationDays = parseInt(orderDurationDays);
        } else if (orderAmount) {
          // Fallback: determine duration from amount
          const amountStr = String(orderAmount);
          const config = PLAN_CONFIG[amountStr as keyof typeof PLAN_CONFIG];
          if (config) {
            durationDays = config.duration_days;
          }
        }
        
        amount = parseInt(orderDetails.notes?.final_amount) || orderDetails.amount || 9900;
        console.log(`Order details: plan=pro, duration_days=${durationDays}, amount=${amount}`);
      }
    } catch (orderError) {
      console.error('Error fetching order details, defaulting to 30 days:', orderError);
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    const now = new Date();
    const expiresAt = new Date(now);
    expiresAt.setDate(expiresAt.getDate() + durationDays);

    const { error: updateError } = await supabase
      .from('user_subscriptions')
      .update({
        plan: 'pro', // ALWAYS pro - both ₹99 and ₹299 grant pro access
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

    console.log(`Pro subscription activated for user: ${user_id}, duration: ${durationDays} days, expires: ${expiresAt.toISOString()}`);

    await supabase.from('payments_log').insert({
      event_type: 'payment_verified',
      user_id: user_id,
      razorpay_payment_id: razorpay_payment_id,
      amount: amount,
      status: 'success',
      found_user: true,
      action_taken: `subscription_activated_pro_${durationDays}d`,
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Pro subscription activated successfully (${durationDays} days)`,
        plan: 'pro',
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
