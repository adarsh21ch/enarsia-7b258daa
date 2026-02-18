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

// NO HARDCODED DURATION MAPPING - Admin Panel is the single source of truth
// Duration MUST come from order notes (set by create-razorpay-order from database)

// Log payment to database
async function logPayment(
  supabase: any, 
  eventType: string, 
  userEmail: string | null, 
  paymentId: string | null, 
  amount: number | null, 
  status: string, 
  actionTaken: string,
  userId: string | null = null,
  foundUser: boolean = false,
  rawPayload: any = null
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
      raw_payload: rawPayload,
    });
  } catch (err) {
    console.error('Failed to log payment:', err);
  }
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

  // Initialize Supabase client with service role
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

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
    const rawBody = await req.text();
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
    const payload = JSON.parse(rawBody);
    const event = payload.event;

    console.log('Received Razorpay event:', event);

    // Handle payment.captured event
    if (event === 'payment.captured') {
      const payment = payload.payload?.payment?.entity;
      
      if (!payment) {
        console.error('No payment entity in payload');
        return new Response(JSON.stringify({ error: 'Invalid payload structure' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const paymentId = payment.id;
      const amount = payment.amount; // in paise
      const notes = payment.notes || {};

      // Try to get email from multiple sources:
      // 1. payment.notes.user_email (from our dynamic order)
      // 2. payment.email (from Razorpay)
      const email = notes.user_email || payment.email;

      console.log(`Payment captured: ${paymentId}, email: ${email}, amount: ${amount}, notes:`, JSON.stringify(notes));

      if (!email) {
        console.error('No email in payment entity or notes');
        await logPayment(supabase, 'payment.captured', null, paymentId, amount, 'error', 'No email found', null, false, payload);
        // Return 200 to prevent Razorpay from retrying
        return new Response(JSON.stringify({ error: 'No email in payment - cannot identify user' }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Find the user by email using profiles table (more reliable than auth.admin.listUsers)
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('user_id')
        .ilike('email', email)
        .maybeSingle();
      
      if (profileError) {
        console.error('Error fetching profile:', profileError);
        await logPayment(supabase, 'payment.captured', email, paymentId, amount, 'error', 'Failed to fetch profile', null, false, payload);
        return new Response(JSON.stringify({ error: 'Failed to fetch user profile' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      if (!profileData) {
        console.error(`User not found for email: ${email}`);
        await logPayment(supabase, 'payment.captured', email, paymentId, amount, 'error', 'User not found', null, false, payload);
        // Return 200 to prevent retries
        return new Response(JSON.stringify({ error: 'User not found' }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const userId = profileData.user_id;
      console.log(`Found user: ${userId} for email: ${email}`);

      // CRITICAL: Get duration_days from order notes - NO FALLBACK
      const durationDays = notes.duration_days ? parseInt(notes.duration_days) : null;
      const planScope = notes.plan_scope || 'app'; // 'app', 'funnels', or 'combined'
      
      if (!durationDays) {
        console.error('Missing duration_days in payment notes');
        await logPayment(supabase, 'payment.captured', email, paymentId, amount, 'error', 'Missing duration_days in notes', userId, true, payload);
        return new Response(JSON.stringify({ 
          error: 'Payment processed but duration not found. Contact support.',
          payment_id: paymentId,
          user_id: userId
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      console.log(`Duration: ${durationDays} days, Scope: ${planScope}`);

      const now = new Date();
      const expiresAt = new Date(now);
      expiresAt.setDate(expiresAt.getDate() + durationDays);
      const paymentReference = paymentId;

      // Helper to upsert app subscription
      const upsertAppSub = async () => {
        const { data: existingSub } = await supabase
          .from('user_subscriptions')
          .select('id')
          .eq('user_id', userId)
          .maybeSingle();

        if (existingSub) {
          const { error } = await supabase
            .from('user_subscriptions')
            .update({
              plan: 'pro',
              status: 'active',
              subscribed_at: now.toISOString(),
              expires_at: expiresAt.toISOString(),
              payment_id: paymentReference,
              updated_at: now.toISOString()
            })
            .eq('user_id', userId);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from('user_subscriptions')
            .insert({
              user_id: userId,
              plan: 'pro',
              status: 'active',
              subscribed_at: now.toISOString(),
              expires_at: expiresAt.toISOString(),
              payment_id: paymentReference
            });
          if (error) throw error;
        }
      };

      // Helper to upsert funnel subscription
      const upsertFunnelSub = async () => {
        const { data: existingSub } = await supabase
          .from('user_funnel_subscriptions')
          .select('id')
          .eq('user_id', userId)
          .maybeSingle();

        if (existingSub) {
          const { error } = await supabase
            .from('user_funnel_subscriptions')
            .update({
              plan: 'pro',
              status: 'active',
              subscribed_at: now.toISOString(),
              expires_at: expiresAt.toISOString(),
              payment_id: paymentReference,
              updated_at: now.toISOString()
            })
            .eq('user_id', userId);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from('user_funnel_subscriptions')
            .insert({
              user_id: userId,
              plan: 'pro',
              status: 'active',
              subscribed_at: now.toISOString(),
              expires_at: expiresAt.toISOString(),
              payment_id: paymentReference
            });
          if (error) throw error;
        }
      };

      try {
        if (planScope === 'funnels') {
          await upsertFunnelSub();
          console.log(`Funnels Pro activated (${durationDays} days) for user: ${userId}`);
          await logPayment(supabase, 'payment.captured', email, paymentId, amount, 'success', `Funnels Pro (${durationDays} days)`, userId, true, null);
        } else if (planScope === 'combined') {
          await upsertAppSub();
          await upsertFunnelSub();
          console.log(`Combined Pro activated (${durationDays} days) for user: ${userId}`);
          await logPayment(supabase, 'payment.captured', email, paymentId, amount, 'success', `Combined Pro (${durationDays} days)`, userId, true, null);
        } else {
          // Default: app only
          await upsertAppSub();
          console.log(`App Pro activated (${durationDays} days) for user: ${userId}`);
          await logPayment(supabase, 'payment.captured', email, paymentId, amount, 'success', `App Pro (${durationDays} days)`, userId, true, null);
        }
      } catch (subError) {
        console.error('Error updating subscription:', subError);
        await logPayment(supabase, 'payment.captured', email, paymentId, amount, 'error', 'Failed to update subscription', userId, true, null);
        return new Response(JSON.stringify({ error: 'Failed to update subscription' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify({ 
        success: true, 
        message: 'User marked as Pro',
        user_id: userId,
        plan: 'pro',
        duration_days: durationDays,
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
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
