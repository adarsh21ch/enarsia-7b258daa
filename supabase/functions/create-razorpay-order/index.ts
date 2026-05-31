import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Simple in-memory rate limiter (per-isolate, resets on cold start)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 5; // 5 requests per minute per user

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

// NO FALLBACK CONFIG - Admin Panel is the single source of truth
// If plan is not found in database, payment creation will fail with a clear error

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const RAZORPAY_KEY_ID = Deno.env.get('RAZORPAY_KEY_ID');
    const RAZORPAY_KEY_SECRET = Deno.env.get('RAZORPAY_KEY_SECRET');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
      console.error('Missing Razorpay credentials');
      return new Response(
        JSON.stringify({ error: 'Payment service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Missing Supabase credentials');
      return new Response(
        JSON.stringify({ error: 'Database service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Require authenticated caller — derive user identity from JWT, never trust body.
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const { data: authData, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );
    if (authError || !authData?.user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const user_id = authData.user.id;
    const user_email = authData.user.email ?? '';

    const { plan_type = 'quarterly', offer } = await req.json();

    // Rate limiting check (keyed off authenticated user id)
    if (!checkRateLimit(user_id)) {
      return new Response(
        JSON.stringify({ error: 'Too many requests. Please wait a moment before trying again.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch plan from database - REQUIRED, no fallbacks
    const { data: planData, error: planError } = await supabase
      .from('admin_subscription_plans')
      .select('*')
      .eq('plan_key', plan_type)
      .eq('is_active', true)
      .single();

    if (planError || !planData) {
      console.error(`Plan ${plan_type} not found in database or inactive:`, planError);
      return new Response(
        JSON.stringify({ error: 'Selected plan is not available. Please refresh and try again.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Plan found - extract config from database
    // Determine plan scope based on plan_key prefix
    const isFunnelsPlan = plan_type.startsWith('funnels_');
    const isCombinedPlan = plan_type.startsWith('combined_');
    const planScope = isCombinedPlan ? 'combined' : isFunnelsPlan ? 'funnels' : 'app';

    const planConfig = {
      amount: planData.price_inr * 100, // Convert rupees to paise
      duration_days: planData.duration_days,
      plan_name: 'pro', // All plans grant Pro access
      plan_scope: planScope, // 'app', 'funnels', or 'combined'
      tier: planData.tier || 'pro', // 3-tier: basic/pro/premium
      description: planData.plan_name,
    };

    console.log(`Plan loaded from database: ${plan_type}, amount: ${planConfig.amount}, duration: ${planConfig.duration_days} days`);

    // Calculate final amount - use discounted amount if offer is present
    let finalAmount = planConfig.amount;
    let offerDetails = null;

    if (offer && offer.discounted_amount) {
      // Validate the offer exists and is active
      const { data: offerData, error: offerError } = await supabase
        .from('admin_offers')
        .select('*')
        .eq('id', offer.offer_id)
        .eq('is_active', true)
        .single();

      if (offerError || !offerData) {
        console.warn(`Offer ${offer.offer_id} not found or inactive`);
        return new Response(
          JSON.stringify({ error: 'Invalid or expired offer' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Validate offer is still within date range
      const now = new Date();
      const startDate = new Date(offerData.start_date);
      const endDate = new Date(offerData.end_date);

      if (now < startDate || now > endDate) {
        return new Response(
          JSON.stringify({ error: 'This offer has expired' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Use the discounted amount (convert to paise)
      finalAmount = Math.round(offer.discounted_amount * 100);
      offerDetails = {
        offer_id: offer.offer_id,
        promo_code: offer.promo_code,
        discount_type: offer.discount_type,
        discount_value: offer.discount_value,
        original_amount: planConfig.amount,
      };

      console.log(`Applying offer: ${offer.promo_code}, original: ${planConfig.amount}, discounted: ${finalAmount}`);
    }

    console.log(`Creating Razorpay order for user: ${user_email}, plan: ${plan_type}, amount: ${finalAmount}, duration: ${planConfig.duration_days} days${offerDetails ? `, offer: ${offerDetails.promo_code}` : ''}`);

    const shortUserId = user_id.slice(0, 8);
    const orderPayload = {
      amount: finalAmount,
      currency: 'INR',
      receipt: `pro_${shortUserId}_${Date.now()}`,
      notes: {
        user_id: user_id,
        user_email: user_email,
        plan: 'pro', // Always Pro
        plan_variant: plan_type, // Plan key for reference
        plan_scope: planConfig.plan_scope, // 'app', 'funnels', or 'combined'
        tier: planConfig.tier, // 3-tier: basic/pro/premium
        duration_days: planConfig.duration_days, // CRITICAL: Pass duration to webhook/verify
        original_amount: planConfig.amount,
        final_amount: finalAmount,
        // Include offer details if present
        ...(offerDetails && {
          offer_applied: 'true',
          offer_id: offerDetails.offer_id,
          promo_code: offerDetails.promo_code,
          discount_type: offerDetails.discount_type,
          discount_value: String(offerDetails.discount_value),
        }),
      }
    };

    const razorpayAuth = btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`);

    const razorpayResponse = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${razorpayAuth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(orderPayload),
    });

    if (!razorpayResponse.ok) {
      const errorText = await razorpayResponse.text();
      console.error('Razorpay API error:', errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to create payment order' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const order = await razorpayResponse.json();
    console.log(`Order created successfully: ${order.id}, plan: pro (${plan_type}), amount: ${finalAmount}, duration: ${planConfig.duration_days} days`);

    return new Response(
      JSON.stringify({
        order_id: order.id,
        amount: order.amount,
        currency: order.currency,
        key_id: RAZORPAY_KEY_ID,
        plan_type: plan_type,
        duration_days: planConfig.duration_days, // Return duration for UI
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error creating order:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
