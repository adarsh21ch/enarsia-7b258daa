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

// Determine plan duration based on amount (in paise)
function getPlanDuration(amountInPaise: number): number {
  // ₹249 = 24900 paise = Monthly (30 days)
  // ₹1999 = 199900 paise = Yearly (365 days)
  // ₹2999 = 299900 paise = Yearly (365 days)
  if (amountInPaise >= 199900) {
    return 365; // Yearly plan
  }
  return 30; // Monthly plan
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  // Initialize Supabase client with service role for logging
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  let rawBody = '';
  let parsedPayload: any = null;

  try {
    const webhookSecret = Deno.env.get('RAZORPAY_WEBHOOK_SECRET');
    if (!webhookSecret) {
      console.error('RAZORPAY_WEBHOOK_SECRET not configured');
      return new Response(JSON.stringify({ error: 'Webhook secret not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get the raw body and signature
    rawBody = await req.text();
    const signature = req.headers.get('x-razorpay-signature');

    if (!signature) {
      console.error('Missing x-razorpay-signature header');
      return new Response(JSON.stringify({ error: 'Missing signature' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Verify the signature
    const isValid = await verifySignature(rawBody, signature, webhookSecret);
    if (!isValid) {
      console.error('Invalid webhook signature');
      return new Response(JSON.stringify({ error: 'Invalid signature' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('Webhook signature verified successfully');

    // Parse the webhook payload
    parsedPayload = JSON.parse(rawBody);
    const event = parsedPayload.event;

    console.log('Received Razorpay event:', event);

    // Handle payment.captured event
    if (event === 'payment.captured') {
      const payment = parsedPayload.payload?.payment?.entity;
      
      if (!payment) {
        console.error('No payment entity in payload');
        await logPayment(supabase, 'payment.captured', null, null, null, 'error', 'No payment entity', null, false, parsedPayload);
        return new Response(JSON.stringify({ error: 'Invalid payload structure' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const email = payment.email;
      const paymentId = payment.id;
      const amount = payment.amount; // in paise
      const notes = payment.notes || {};

      console.log(`Payment captured: ${paymentId}, email: ${email}, amount: ${amount}, notes:`, notes);

      // Try to get email from notes if not in payment.email
      const userEmail = email || notes.user_email;

      if (!userEmail) {
        console.error('No email in payment entity or notes');
        await logPayment(supabase, 'payment.captured', null, paymentId, amount, 'error', 'No email found', null, false, parsedPayload);
        return new Response(JSON.stringify({ error: 'No email in payment' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Find the user by email
      const { data: userData, error: userError } = await supabase.auth.admin.listUsers();
      
      if (userError) {
        console.error('Error fetching users:', userError);
        await logPayment(supabase, 'payment.captured', userEmail, paymentId, amount, 'error', `Failed to fetch users: ${userError.message}`, null, false, parsedPayload);
        return new Response(JSON.stringify({ error: 'Failed to fetch users' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const user = userData.users.find(u => u.email?.toLowerCase() === userEmail.toLowerCase());
      
      if (!user) {
        console.error(`User not found for email: ${userEmail}`);
        await logPayment(supabase, 'payment.captured', userEmail, paymentId, amount, 'error', 'User not found', null, false, parsedPayload);
        // Return 200 to prevent Razorpay from retrying - user just doesn't exist
        return new Response(JSON.stringify({ success: true, message: 'User not found, payment logged' }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      console.log(`Found user: ${user.id} for email: ${userEmail}`);

      // Calculate expiration based on plan amount
      const planDays = getPlanDuration(amount);
      const now = new Date();
      const expiresAt = new Date(now);
      expiresAt.setDate(expiresAt.getDate() + planDays);

      console.log(`Plan duration: ${planDays} days, expires at: ${expiresAt.toISOString()}`);

      // Store payment reference (last 4 chars for security)
      const paymentReference = paymentId.slice(-4);

      // Update or insert subscription
      const { data: existingSub } = await supabase
        .from('user_subscriptions')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      let actionTaken = '';

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
          await logPayment(supabase, 'payment.captured', userEmail, paymentId, amount, 'error', `Failed to update subscription: ${updateError.message}`, user.id, true, parsedPayload);
          return new Response(JSON.stringify({ error: 'Failed to update subscription' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        actionTaken = `Updated to Pro (${planDays} days)`;
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
          await logPayment(supabase, 'payment.captured', userEmail, paymentId, amount, 'error', `Failed to create subscription: ${insertError.message}`, user.id, true, parsedPayload);
          return new Response(JSON.stringify({ error: 'Failed to create subscription' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        actionTaken = `Created Pro (${planDays} days)`;
        console.log(`Created Pro subscription for user: ${user.id}, expires: ${expiresAt.toISOString()}`);
      }

      // Log successful payment
      await logPayment(supabase, 'payment.captured', userEmail, paymentId, amount, 'success', actionTaken, user.id, true, null);

      return new Response(JSON.stringify({ 
        success: true, 
        message: 'User marked as Pro',
        user_id: user.id,
        plan_days: planDays,
        expires_at: expiresAt.toISOString()
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // For other events, just acknowledge
    console.log(`Ignoring event: ${event}`);
    return new Response(JSON.stringify({ success: true, message: 'Event ignored' }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Webhook processing error:', error);
    await logPayment(supabase, 'webhook_error', null, null, null, 'error', String(error), null, false, parsedPayload || rawBody);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

// Helper function to log payments for debugging
async function logPayment(
  supabase: any,
  eventType: string,
  userEmail: string | null,
  paymentId: string | null,
  amount: number | null,
  status: string,
  actionTaken: string | null,
  userId: string | null,
  foundUser: boolean,
  rawPayload: any
) {
  try {
    await supabase.from('payments_log').insert({
      event_type: eventType,
      user_email: userEmail,
      razorpay_payment_id: paymentId,
      amount: amount,
      status: status,
      action_taken: actionTaken,
      user_id: userId,
      found_user: foundUser,
      raw_payload: rawPayload ? JSON.stringify(rawPayload).substring(0, 5000) : null
    });
  } catch (logError) {
    console.error('Failed to log payment:', logError);
  }
}
