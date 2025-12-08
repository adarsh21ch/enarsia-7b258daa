import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-razorpay-signature',
};

// Verify Razorpay webhook signature using HMAC SHA256
async function verifySignature(payload: string, signature: string, secret: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  
  const signatureBuffer = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  const expectedSignature = Array.from(new Uint8Array(signatureBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  
  return expectedSignature === signature;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Initialize Supabase client with service role (for logging)
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Helper to log to payments_log table
  async function logPayment(data: {
    event_type: string;
    user_email?: string | null;
    razorpay_payment_id?: string | null;
    amount?: number | null;
    status?: string | null;
    found_user?: boolean;
    user_id?: string | null;
    action_taken?: string | null;
    raw_payload?: object | null;
    error_message?: string | null;
  }) {
    try {
      const { error } = await supabase.from('payments_log').insert({
        event_type: data.event_type,
        user_email: data.user_email || null,
        razorpay_payment_id: data.razorpay_payment_id || null,
        amount: data.amount || null,
        status: data.status || null,
        found_user: data.found_user ?? false,
        user_id: data.user_id || null,
        action_taken: data.action_taken || null,
        raw_payload: data.raw_payload || null,
        error_message: data.error_message || null,
      });
      if (error) {
        console.error('Failed to insert payment log:', error);
      }
    } catch (e) {
      console.error('Exception logging payment:', e);
    }
  }

  if (req.method !== 'POST') {
    await logPayment({
      event_type: 'invalid_method',
      action_taken: 'rejected',
      error_message: `Method ${req.method} not allowed`,
    });
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    const webhookSecret = Deno.env.get('RAZORPAY_WEBHOOK_SECRET');
    if (!webhookSecret) {
      console.error('RAZORPAY_WEBHOOK_SECRET not configured');
      await logPayment({
        event_type: 'config_error',
        action_taken: 'rejected',
        error_message: 'RAZORPAY_WEBHOOK_SECRET not configured',
      });
      return new Response(JSON.stringify({ error: 'Webhook secret not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get the raw body and signature
    const rawBody = await req.text();
    const signature = req.headers.get('x-razorpay-signature');

    if (!signature) {
      console.error('Missing x-razorpay-signature header');
      await logPayment({
        event_type: 'missing_signature',
        action_taken: 'rejected',
        error_message: 'Missing x-razorpay-signature header',
      });
      return new Response(JSON.stringify({ error: 'Missing signature' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Verify the signature
    const isValid = await verifySignature(rawBody, signature, webhookSecret);
    if (!isValid) {
      console.error('Invalid webhook signature');
      await logPayment({
        event_type: 'invalid_signature',
        action_taken: 'rejected',
        error_message: 'Invalid webhook signature',
      });
      return new Response(JSON.stringify({ error: 'Invalid signature' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('Webhook signature verified successfully');

    // Parse the webhook payload
    const payload = JSON.parse(rawBody);
    const event = payload.event;

    console.log('Received Razorpay event:', event);

    // Log ALL events for debugging (not just payment.captured)
    const payment = payload.payload?.payment?.entity;
    const email = payment?.email || null;
    const paymentId = payment?.id || null;
    const amount = payment?.amount || null;

    // If not payment.captured, just log and acknowledge
    if (event !== 'payment.captured') {
      console.log(`Ignoring event: ${event}`);
      await logPayment({
        event_type: event,
        user_email: email,
        razorpay_payment_id: paymentId,
        amount: amount,
        status: 'ignored',
        action_taken: 'event_ignored',
        raw_payload: payload,
      });
      return new Response(JSON.stringify({ success: true, message: 'Event ignored' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Handle payment.captured event
    if (!payment) {
      console.error('No payment entity in payload');
      await logPayment({
        event_type: event,
        action_taken: 'rejected',
        error_message: 'No payment entity in payload',
        raw_payload: payload,
      });
      return new Response(JSON.stringify({ error: 'Invalid payload structure' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`Payment captured: ${paymentId}, email: ${email}, amount: ${amount}`);

    if (!email) {
      console.error('No email in payment entity');
      await logPayment({
        event_type: event,
        razorpay_payment_id: paymentId,
        amount: amount,
        status: 'captured',
        found_user: false,
        action_taken: 'no_email_in_payload',
        error_message: 'No email in payment entity',
        raw_payload: payload,
      });
      // Return 200 to prevent Razorpay from retrying
      return new Response(JSON.stringify({ success: true, message: 'No email in payment, logged for review' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Find the user by email
    const { data: userData, error: userError } = await supabase.auth.admin.listUsers();
    
    if (userError) {
      console.error('Error fetching users:', userError);
      await logPayment({
        event_type: event,
        user_email: email,
        razorpay_payment_id: paymentId,
        amount: amount,
        status: 'captured',
        found_user: false,
        action_taken: 'user_fetch_error',
        error_message: `Error fetching users: ${userError.message}`,
        raw_payload: payload,
      });
      return new Response(JSON.stringify({ error: 'Failed to fetch users' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const user = userData.users.find(u => u.email?.toLowerCase() === email.toLowerCase());
    
    if (!user) {
      console.error(`User not found for email: ${email}`);
      await logPayment({
        event_type: event,
        user_email: email,
        razorpay_payment_id: paymentId,
        amount: amount,
        status: 'captured',
        found_user: false,
        action_taken: 'no_user_found',
        error_message: `Razorpay webhook: no user found for email = ${email}`,
        raw_payload: payload,
      });
      // Return 200 to prevent Razorpay from retrying - log for manual review
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'User not found, logged for review' 
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`Found user: ${user.id} for email: ${email}`);

    // Calculate expiration (30 days from now)
    const now = new Date();
    const expiresAt = new Date(now);
    expiresAt.setDate(expiresAt.getDate() + 30);

    // Hash the payment ID for security (store only last 4 chars as reference)
    const paymentReference = paymentId.slice(-4);

    // Update or insert subscription
    const { data: existingSub } = await supabase
      .from('user_subscriptions')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    let subscriptionError = null;

    if (existingSub) {
      // Update existing subscription
      const { error: updateError } = await supabase
        .from('user_subscriptions')
        .update({
          plan: 'pro',
          status: 'active',
          subscribed_at: now.toISOString(),
          expires_at: expiresAt.toISOString(),
          payment_id: paymentReference,
          updated_at: now.toISOString()
        })
        .eq('user_id', user.id);

      subscriptionError = updateError;
      if (updateError) {
        console.error('Error updating subscription:', updateError);
      } else {
        console.log(`Updated subscription to Pro for user: ${user.id}`);
      }
    } else {
      // Insert new subscription
      const { error: insertError } = await supabase
        .from('user_subscriptions')
        .insert({
          user_id: user.id,
          plan: 'pro',
          status: 'active',
          subscribed_at: now.toISOString(),
          expires_at: expiresAt.toISOString(),
          payment_id: paymentReference
        });

      subscriptionError = insertError;
      if (insertError) {
        console.error('Error inserting subscription:', insertError);
      } else {
        console.log(`Created Pro subscription for user: ${user.id}`);
      }
    }

    if (subscriptionError) {
      await logPayment({
        event_type: event,
        user_email: email,
        razorpay_payment_id: paymentId,
        amount: amount,
        status: 'captured',
        found_user: true,
        user_id: user.id,
        action_taken: 'subscription_update_failed',
        error_message: `Failed to update subscription: ${subscriptionError.message}`,
        raw_payload: payload,
      });
      return new Response(JSON.stringify({ error: 'Failed to update subscription' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Log successful upgrade
    await logPayment({
      event_type: event,
      user_email: email,
      razorpay_payment_id: paymentId,
      amount: amount,
      status: 'captured',
      found_user: true,
      user_id: user.id,
      action_taken: 'upgraded_to_pro',
      raw_payload: payload,
    });

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'User marked as Pro',
      user_id: user.id,
      expires_at: expiresAt.toISOString()
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Webhook processing error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    await logPayment({
      event_type: 'processing_error',
      action_taken: 'error',
      error_message: `Webhook processing error: ${errorMessage}`,
    });
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
