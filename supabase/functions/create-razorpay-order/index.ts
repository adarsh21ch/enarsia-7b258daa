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

// Toggle this flag for testing (set to false for production)
const TEST_MODE = false;

// IMPORTANT: Both plans are PRO access, only duration differs
// ₹99 = Pro 1 month, ₹299 = Pro 4 months
const PLAN_CONFIG = {
  '1month': {
    amount: TEST_MODE ? 100 : 9900, // ₹1 test or ₹99 production (in paise)
    duration_days: 30,
    plan_name: 'pro', // Always 'pro' access
    description: 'Pro – 1 Month',
  },
  '4months': {
    amount: TEST_MODE ? 100 : 29900, // ₹1 test or ₹299 production (in paise)
    duration_days: 120,
    plan_name: 'pro', // Always 'pro' access
    description: 'Pro – 4 Months',
  },
  // Legacy support - map old plan names to new ones
  mini: {
    amount: TEST_MODE ? 100 : 9900,
    duration_days: 30,
    plan_name: 'pro',
    description: 'Pro – 1 Month',
  },
  pro: {
    amount: TEST_MODE ? 100 : 29900,
    duration_days: 120,
    plan_name: 'pro',
    description: 'Pro – 4 Months',
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

    const { user_id, user_email, plan_type = 'pro' } = await req.json();

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

    const validPlanTypes = ['1month', '4months', 'mini', 'pro'];
    const selectedPlanKey = validPlanTypes.includes(plan_type) ? plan_type : '4months';
    const planConfig = PLAN_CONFIG[selectedPlanKey as keyof typeof PLAN_CONFIG];

    const finalAmount = planConfig.amount;

    console.log(`Creating Razorpay order for user: ${user_email}, plan_key: ${selectedPlanKey}, plan: ${planConfig.plan_name}, duration: ${planConfig.duration_days} days, amount: ${finalAmount}`);

    const shortUserId = user_id.slice(0, 8);
    const orderPayload = {
      amount: finalAmount,
      currency: 'INR',
      receipt: `pro_${planConfig.duration_days}d_${shortUserId}_${Date.now()}`,
      notes: {
        user_id: user_id,
        user_email: user_email,
        plan: 'pro', // ALWAYS pro - both plans grant pro access
        plan_key: selectedPlanKey, // For reference
        duration_days: planConfig.duration_days,
        original_amount: planConfig.amount,
        final_amount: finalAmount,
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
    console.log(`Order created successfully: ${order.id}, plan: pro, duration: ${planConfig.duration_days} days, amount: ${finalAmount}`);

    return new Response(
      JSON.stringify({
        order_id: order.id,
        amount: order.amount,
        currency: order.currency,
        key_id: RAZORPAY_KEY_ID,
        plan_type: 'pro', // Always pro
        plan_key: selectedPlanKey,
        duration_days: planConfig.duration_days,
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