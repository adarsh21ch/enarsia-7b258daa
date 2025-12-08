import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PLAN_CONFIG = {
  monthly: {
    amount: 24900, // ₹249 in paise
    duration_days: 30,
    description: 'NevorAI Pro Monthly',
  },
  yearly: {
    amount: 299900, // ₹2,999 in paise
    discountedAmount: 199900, // ₹1,999 in paise (with ACHIEVERS1000)
    duration_days: 365,
    description: 'NevorAI Pro Yearly',
  },
};

const VALID_COUPONS = {
  'ACHIEVERS1000': {
    discount: 100000, // ₹1,000 in paise
    applicablePlans: ['yearly'],
  },
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const RAZORPAY_KEY_ID = Deno.env.get('RAZORPAY_KEY_ID');
    const RAZORPAY_KEY_SECRET = Deno.env.get('RAZORPAY_KEY_SECRET');

    if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
      console.error('Missing Razorpay credentials');
      return new Response(
        JSON.stringify({ error: 'Payment service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { user_id, user_email, plan_type = 'monthly', coupon_code } = await req.json();

    if (!user_id || !user_email) {
      return new Response(
        JSON.stringify({ error: 'Missing user information' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate plan type
    const validPlanTypes = ['monthly', 'yearly'];
    const selectedPlan = validPlanTypes.includes(plan_type) ? plan_type : 'monthly';
    const planConfig = PLAN_CONFIG[selectedPlan as keyof typeof PLAN_CONFIG];

    // Calculate amount with coupon if applicable
    let finalAmount = planConfig.amount;
    let appliedCoupon: string | null = null;

    if (coupon_code) {
      const upperCoupon = coupon_code.toUpperCase();
      const couponConfig = VALID_COUPONS[upperCoupon as keyof typeof VALID_COUPONS];
      
      if (couponConfig && couponConfig.applicablePlans.includes(selectedPlan)) {
        finalAmount = planConfig.amount - couponConfig.discount;
        appliedCoupon = upperCoupon;
        console.log(`Coupon ${upperCoupon} applied, discount: ${couponConfig.discount} paise`);
      } else {
        console.log(`Invalid or non-applicable coupon: ${coupon_code}`);
      }
    }

    console.log(`Creating Razorpay order for user: ${user_email}, plan: ${selectedPlan}, amount: ${finalAmount}, coupon: ${appliedCoupon}`);

    // Create Razorpay order via API
    // Receipt must be max 40 chars - use short user_id prefix + timestamp
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
