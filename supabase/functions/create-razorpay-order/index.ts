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

const PLAN_CONFIG = {
  monthly: {
    amount: 24900,
    duration_days: 30,
    description: 'NevorAI Pro Monthly',
  },
  yearly: {
    amount: 299900,
    discountedAmount: 199900,
    duration_days: 365,
    description: 'NevorAI Pro Yearly',
  },
};

const VALID_COUPONS: Record<string, { discount: number; applicablePlans: string[]; maxUses: number }> = {
  'DECEMBER1000': {
    discount: 100000,
    applicablePlans: ['yearly'],
    maxUses: 50,
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

    const { user_id, user_email, plan_type = 'monthly', coupon_code } = await req.json();

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

    const validPlanTypes = ['monthly', 'yearly'];
    const selectedPlan = validPlanTypes.includes(plan_type) ? plan_type : 'monthly';
    const planConfig = PLAN_CONFIG[selectedPlan as keyof typeof PLAN_CONFIG];

    let finalAmount = planConfig.amount;
    let appliedCoupon: string | null = null;

    if (coupon_code) {
      const upperCoupon = coupon_code.toUpperCase();
      const couponConfig = VALID_COUPONS[upperCoupon];
      
      if (couponConfig && couponConfig.applicablePlans.includes(selectedPlan)) {
        const { count, error: countError } = await supabase
          .from('coupon_usages')
          .select('*', { count: 'exact', head: true })
          .eq('coupon_code', upperCoupon);

        if (countError) {
          console.error('Error checking coupon usage:', countError);
        }

        const currentUsage = count || 0;
        
        if (currentUsage >= couponConfig.maxUses) {
          console.log(`Coupon ${upperCoupon} has reached usage limit (${currentUsage}/${couponConfig.maxUses})`);
          return new Response(
            JSON.stringify({ error: 'This coupon has reached its usage limit.' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { data: existingUsage } = await supabase
          .from('coupon_usages')
          .select('id')
          .eq('coupon_code', upperCoupon)
          .eq('user_id', user_id)
          .single();

        if (existingUsage) {
          console.log(`User ${user_id} has already used coupon ${upperCoupon}`);
          return new Response(
            JSON.stringify({ error: 'You have already used this coupon.' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        finalAmount = planConfig.amount - couponConfig.discount;
        appliedCoupon = upperCoupon;
        console.log(`Coupon ${upperCoupon} applied, discount: ${couponConfig.discount} paise, usage: ${currentUsage + 1}/${couponConfig.maxUses}`);
      } else {
        console.log(`Invalid or non-applicable coupon: ${coupon_code}`);
        return new Response(
          JSON.stringify({ error: 'Invalid coupon code. Please check and try again.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    console.log(`Creating Razorpay order for user: ${user_email}, plan: ${selectedPlan}, amount: ${finalAmount}, coupon: ${appliedCoupon}`);

    const shortUserId = user_id.slice(0, 8);
    const orderPayload = {
      amount: finalAmount,
      currency: 'INR',
      receipt: `pro_${selectedPlan.slice(0, 1)}_${shortUserId}_${Date.now()}`,
      notes: {
        user_id: user_id,
        user_email: user_email,
        plan: 'pro',
        plan_type: selectedPlan,
        duration_days: planConfig.duration_days,
        coupon_applied: appliedCoupon || 'none',
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
    console.log(`Order created successfully: ${order.id}, plan: ${selectedPlan}, amount: ${finalAmount}`);

    if (appliedCoupon) {
      const { error: insertError } = await supabase
        .from('coupon_usages')
        .insert({
          coupon_code: appliedCoupon,
          user_id: user_id,
        });

      if (insertError) {
        console.error('Error recording coupon usage:', insertError);
      } else {
        console.log(`Coupon usage recorded for user ${user_id}, coupon ${appliedCoupon}`);
      }
    }

    return new Response(
      JSON.stringify({
        order_id: order.id,
        amount: order.amount,
        currency: order.currency,
        key_id: RAZORPAY_KEY_ID,
        plan_type: selectedPlan,
        coupon_applied: appliedCoupon,
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
