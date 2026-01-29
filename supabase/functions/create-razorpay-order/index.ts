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

// Fallback plan config if database fetch fails
const FALLBACK_PLAN_CONFIG = {
  monthly: {
    amount: 9900, // ₹99 in paise
    duration_days: 30,
    plan_name: 'pro',
    description: 'Pro Monthly',
  },
  quarterly: {
    amount: 29900, // ₹299 in paise
    duration_days: 120,
    plan_name: 'pro',
    description: 'Pro 4-Month',
  },
};

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

    const { user_id, user_email, plan_type = 'quarterly', offer } = await req.json();

    if (!user_id || !user_email) {
      return new Response(
        JSON.stringify({ error: 'Missing user information' }),
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

    // Fetch plan from database
    let planConfig;
    try {
      const { data: planData, error: planError } = await supabase
        .from('admin_subscription_plans')
        .select('*')
        .eq('plan_key', plan_type)
        .eq('is_active', true)
        .single();

      if (planError || !planData) {
        console.warn(`Plan ${plan_type} not found in database, using fallback`);
        const fallbackPlan = FALLBACK_PLAN_CONFIG[plan_type as keyof typeof FALLBACK_PLAN_CONFIG] 
          || FALLBACK_PLAN_CONFIG.quarterly;
        planConfig = {
          amount: fallbackPlan.amount,
          duration_days: fallbackPlan.duration_days,
          plan_name: fallbackPlan.plan_name,
          description: fallbackPlan.description,
        };
      } else {
        planConfig = {
          amount: planData.price_inr * 100, // Convert rupees to paise
          duration_days: planData.duration_days,
          plan_name: 'pro', // All plans grant Pro access
          description: planData.plan_name,
        };
      }
    } catch (dbError) {
      console.error('Database error fetching plan:', dbError);
      const fallbackPlan = FALLBACK_PLAN_CONFIG[plan_type as keyof typeof FALLBACK_PLAN_CONFIG] 
        || FALLBACK_PLAN_CONFIG.quarterly;
      planConfig = {
        amount: fallbackPlan.amount,
        duration_days: fallbackPlan.duration_days,
        plan_name: fallbackPlan.plan_name,
        description: fallbackPlan.description,
      };
    }

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
        duration_days: planConfig.duration_days,
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

    const authHeader = btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`);

    const razorpayResponse = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${authHeader}`,
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
