import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-razorpay-signature',
};

// Amount thresholds in paise
const YEARLY_AMOUNT_THRESHOLD = 100000; // ₹1000+ is yearly plan
const MONTHLY_AMOUNT = 24900; // ₹249
const YEARLY_NORMAL_AMOUNT = 299900; // ₹2999
const YEARLY_DISCOUNTED_AMOUNT = 199900; // ₹1999

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

  // Initialize Supabase client with service role for logging
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  let rawBody = '';
  let event = 'unknown';
  let paymentId = '';
  let email = '';
  let amount = 0;

  try {
    const webhookSecret = Deno.env.get('RAZORPAY_WEBHOOK_SECRET');
    if (!webhookSecret) {
      console.error('RAZORPAY_WEBHOOK_SECRET not configured');
      await supabase.from('payments_log').insert({
        event_type: 'webhook_error',
        status: 'error',
        error_message: 'RAZORPAY_WEBHOOK_SECRET not configured',
        action_taken: 'rejected'
      });
      return new Response(JSON.stringify({ error: 'Webhook secret not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get the raw body and signature
    rawBody = await req.text();
    const signature = req.headers.get('x-razorpay-signature');

    console.log('Webhook received, body length:', rawBody.length);

    if (!signature) {
      console.error('Missing x-razorpay-signature header');
      await supabase.from('payments_log').insert({
        event_type: 'webhook_error',
        status: 'error',
        error_message: 'Missing x-razorpay-signature header',
        action_taken: 'rejected',
        raw_payload: { body_length: rawBody.length }
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
      await supabase.from('payments_log').insert({
        event_type: 'webhook_error',
        status: 'error',
        error_message: 'Invalid webhook signature',
        action_taken: 'rejected'
      });
      return new Response(JSON.stringify({ error: 'Invalid signature' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('Webhook signature verified successfully');

    // Parse the webhook payload
    const payload = JSON.parse(rawBody);
    event = payload.event;

    console.log('Received Razorpay event:', event);

    // Handle payment.captured event (also handle payment_link.paid for payment links)
    if (event === 'payment.captured' || event === 'payment_link.paid') {
      const payment = payload.payload?.payment?.entity;
      
      if (!payment) {
        console.error('No payment entity in payload');
        await supabase.from('payments_log').insert({
          event_type: event,
          status: 'error',
          error_message: 'No payment entity in payload',
          action_taken: 'rejected',
          raw_payload: payload
        });
        return new Response(JSON.stringify({ error: 'Invalid payload structure' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      email = payment.email || '';
      paymentId = payment.id || '';
      amount = payment.amount || 0; // in paise

      console.log(`Payment captured: ${paymentId}, email: ${email}, amount: ${amount} paise`);

      // Log payment received
      await supabase.from('payments_log').insert({
        event_type: event,
        user_email: email,
        razorpay_payment_id: paymentId,
        amount: amount,
        status: 'processing',
        action_taken: 'payment_received',
        raw_payload: { notes: payment.notes, method: payment.method }
      });

      if (!email) {
        console.error('No email in payment entity');
        await supabase.from('payments_log').insert({
          event_type: event,
          razorpay_payment_id: paymentId,
          amount: amount,
          status: 'error',
          error_message: 'No email in payment entity',
          action_taken: 'rejected'
        });
        // Return 200 to prevent Razorpay retries
        return new Response(JSON.stringify({ success: true, message: 'No email - cannot process' }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Find the user by email
      const { data: userData, error: userError } = await supabase.auth.admin.listUsers();
      
      if (userError) {
        console.error('Error fetching users:', userError);
        await supabase.from('payments_log').insert({
          event_type: event,
          user_email: email,
          razorpay_payment_id: paymentId,
          amount: amount,
          status: 'error',
          found_user: false,
          error_message: `Error fetching users: ${userError.message}`,
          action_taken: 'db_error'
        });
        return new Response(JSON.stringify({ error: 'Failed to fetch users' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const user = userData.users.find(u => u.email?.toLowerCase() === email.toLowerCase());
      
      if (!user) {
        console.error(`User not found for email: ${email}`);
        await supabase.from('payments_log').insert({
          event_type: event,
          user_email: email,
          razorpay_payment_id: paymentId,
          amount: amount,
          status: 'error',
          found_user: false,
          error_message: `User not found for email: ${email}`,
          action_taken: 'user_not_found'
        });
        // Return 200 to prevent Razorpay from retrying - log and handle manually
        return new Response(JSON.stringify({ success: true, message: 'User not found - logged for manual review' }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      console.log(`Found user: ${user.id} for email: ${email}`);

      // Determine plan duration based on amount
      // Yearly plan: ₹1999 (199900 paise) or ₹2999 (299900 paise) = 365 days
      // Monthly plan: ₹249 (24900 paise) = 30 days
      let durationDays = 30;
      let planType = 'monthly';
      
      if (amount >= YEARLY_AMOUNT_THRESHOLD) {
        // Any amount ₹1000+ is considered yearly
        durationDays = 365;
        planType = amount >= YEARLY_NORMAL_AMOUNT ? 'yearly_full' : 'yearly_discounted';
      }

      console.log(`Plan determined: ${planType}, duration: ${durationDays} days for amount ${amount} paise`);

      // Calculate expiration
      const now = new Date();
      const expiresAt = new Date(now);
      expiresAt.setDate(expiresAt.getDate() + durationDays);

      // Store only last 4 chars as payment reference
      const paymentReference = paymentId.slice(-4);

      // Update or insert subscription
      const { data: existingSub } = await supabase
        .from('user_subscriptions')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

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

        if (updateError) {
          console.error('Error updating subscription:', updateError);
          await supabase.from('payments_log').insert({
            event_type: event,
            user_email: email,
            user_id: user.id,
            razorpay_payment_id: paymentId,
            amount: amount,
            status: 'error',
            found_user: true,
            error_message: `Error updating subscription: ${updateError.message}`,
            action_taken: 'update_failed'
          });
          return new Response(JSON.stringify({ error: 'Failed to update subscription' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        console.log(`Updated subscription to Pro for user: ${user.id}, expires: ${expiresAt.toISOString()}`);
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

        if (insertError) {
          console.error('Error inserting subscription:', insertError);
          await supabase.from('payments_log').insert({
            event_type: event,
            user_email: email,
            user_id: user.id,
            razorpay_payment_id: paymentId,
            amount: amount,
            status: 'error',
            found_user: true,
            error_message: `Error inserting subscription: ${insertError.message}`,
            action_taken: 'insert_failed'
          });
          return new Response(JSON.stringify({ error: 'Failed to create subscription' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        console.log(`Created Pro subscription for user: ${user.id}, expires: ${expiresAt.toISOString()}`);
      }

      // Log successful activation
      await supabase.from('payments_log').insert({
        event_type: event,
        user_email: email,
        user_id: user.id,
        razorpay_payment_id: paymentId,
        amount: amount,
        status: 'success',
        found_user: true,
        action_taken: `subscription_activated_${planType}_${durationDays}days`
      });

      return new Response(JSON.stringify({ 
        success: true, 
        message: 'User marked as Pro',
        user_id: user.id,
        plan_type: planType,
        duration_days: durationDays,
        expires_at: expiresAt.toISOString()
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // For other events, log and acknowledge
    console.log(`Ignoring event: ${event}`);
    await supabase.from('payments_log').insert({
      event_type: event,
      status: 'ignored',
      action_taken: 'event_ignored'
    });
    return new Response(JSON.stringify({ success: true, message: 'Event ignored' }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Webhook processing error:', errorMessage);
    await supabase.from('payments_log').insert({
      event_type: event || 'unknown',
      user_email: email || null,
      razorpay_payment_id: paymentId || null,
      amount: amount || null,
      status: 'error',
      error_message: `Webhook error: ${errorMessage}`,
      action_taken: 'exception'
    });
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
