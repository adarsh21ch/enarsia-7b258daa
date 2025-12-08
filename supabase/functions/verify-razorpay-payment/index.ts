import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
      console.error('Missing Razorpay credentials');
      return new Response(
        JSON.stringify({ error: 'Payment service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { razorpay_payment_id, user_id, plan_type } = await req.json();

    if (!razorpay_payment_id || !user_id) {
      console.error('Missing required parameters');
      return new Response(
        JSON.stringify({ error: 'Missing payment verification parameters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Verifying payment for user: ${user_id}, payment_id: ${razorpay_payment_id}`);

    // Verify payment directly with Razorpay API
    const authHeader = btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`);
    
    const paymentResponse = await fetch(`https://api.razorpay.com/v1/payments/${razorpay_payment_id}`, {
      headers: {
        'Authorization': `Basic ${authHeader}`,
      },
    });

    if (!paymentResponse.ok) {
      console.error('Failed to fetch payment from Razorpay:', paymentResponse.status);
      return new Response(
        JSON.stringify({ error: 'Failed to verify payment with Razorpay' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const paymentDetails = await paymentResponse.json();
    console.log('Payment details from Razorpay:', JSON.stringify(paymentDetails));

    // Check if payment is captured (successful)
    if (paymentDetails.status !== 'captured') {
      console.error('Payment not captured. Status:', paymentDetails.status);
      return new Response(
        JSON.stringify({ 
          error: `Payment not successful. Status: ${paymentDetails.status}`,
          status: paymentDetails.status 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Determine plan type and duration based on amount
    const amount = paymentDetails.amount; // in paise
    let planType = plan_type || 'monthly';
    let durationDays = 30;

    // Detect plan based on amount
    if (amount >= 199900) { // ₹1,999 or more = yearly
      planType = 'yearly';
      durationDays = 365;
    } else if (amount >= 24900) { // ₹249 = monthly
      planType = 'monthly';
      durationDays = 30;
    } else {
      // Test payment (₹1) - use provided plan_type or default to monthly
      durationDays = planType === 'yearly' ? 365 : 30;
    }

    console.log(`Detected plan: ${planType}, duration: ${durationDays} days, amount: ${amount}`);

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
      event_type: 'payment_verified_api',
      user_id: user_id,
      razorpay_payment_id: razorpay_payment_id,
      amount: amount,
      status: 'success',
      found_user: true,
      action_taken: `subscription_activated_${planType}`,
      raw_payload: paymentDetails,
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Pro subscription activated successfully',
        plan_type: planType,
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