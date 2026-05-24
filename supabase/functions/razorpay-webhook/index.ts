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

// Helper: find user by email from profiles table
async function findUserByEmail(supabase: any, email: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('user_id')
    .ilike('email', email)
    .maybeSingle();
  if (error) throw error;
  return data?.user_id || null;
}

// Helper: upsert app subscription
async function upsertAppSub(supabase: any, userId: string, updates: any) {
  const { data: existingSub } = await supabase
    .from('user_subscriptions')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();

  if (existingSub) {
    const { error } = await supabase
      .from('user_subscriptions')
      .update(updates)
      .eq('user_id', userId);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from('user_subscriptions')
      .insert({ user_id: userId, ...updates });
    if (error) throw error;
  }
}

// Helper: upsert funnel subscription
async function upsertFunnelSub(supabase: any, userId: string, updates: any) {
  const { data: existingSub } = await supabase
    .from('user_funnel_subscriptions')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();

  if (existingSub) {
    const { error } = await supabase
      .from('user_funnel_subscriptions')
      .update(updates)
      .eq('user_id', userId);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from('user_funnel_subscriptions')
      .insert({ user_id: userId, ...updates });
    if (error) throw error;
  }
}

// Helper: activate subscription based on scope
async function activateSubscription(supabase: any, userId: string, planScope: string, updates: any) {
  if (planScope === 'funnels') {
    await upsertFunnelSub(supabase, userId, updates);
  } else if (planScope === 'combined') {
    await upsertAppSub(supabase, userId, updates);
    await upsertFunnelSub(supabase, userId, updates);
  } else {
    await upsertAppSub(supabase, userId, updates);
  }
}

// Look up plan by razorpay_plan_id to get duration_days, plan_scope, and tier
async function lookupPlanByRazorpayId(supabase: any, razorpayPlanId: string) {
  const { data, error } = await supabase
    .from('admin_subscription_plans')
    .select('plan_key, duration_days, tier')
    .eq('razorpay_plan_id', razorpayPlanId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  
  let planScope = 'app';
  if (data.plan_key.startsWith('funnels_')) planScope = 'funnels';
  if (data.plan_key.startsWith('combined_')) planScope = 'combined';
  
  return { duration_days: data.duration_days, plan_scope: planScope, tier: data.tier || 'pro' };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

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

    const rawBody = await req.text();
    const signature = req.headers.get('x-razorpay-signature');

    if (!signature) {
      return new Response(JSON.stringify({ error: 'Missing signature' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const isValid = await verifySignature(rawBody, signature, webhookSecret);
    if (!isValid) {
      console.error('Invalid webhook signature');
      return new Response(JSON.stringify({ error: 'Invalid signature' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('Webhook signature verified successfully');

    const payload = JSON.parse(rawBody);
    const event = payload.event;
    console.log('Received Razorpay event:', event);

    // ---- Idempotency guard: dedupe by Razorpay event id ----
    const eventId =
      req.headers.get('x-razorpay-event-id') ||
      payload.id ||
      `${event}:${payload.payload?.payment?.entity?.id || payload.payload?.subscription?.entity?.id || ''}:${payload.created_at || ''}`;

    if (eventId) {
      const { error: dedupErr } = await supabase
        .from('subscription_events')
        .insert({
          razorpay_event_id: eventId,
          event_type: event,
          raw_payload: payload,
        });
      if (dedupErr) {
        // Duplicate (unique violation) → already processed; ack 200
        if ((dedupErr as any).code === '23505') {
          console.log(`Duplicate event ${eventId} — already processed, acking.`);
          return new Response(JSON.stringify({ success: true, duplicate: true }), {
            status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        console.error('subscription_events insert error (non-fatal):', dedupErr);
      }
    }



    // =========================================
    // ONE-TIME: payment.captured (existing flow)
    // =========================================
    if (event === 'payment.captured') {
      const payment = payload.payload?.payment?.entity;
      if (!payment) {
        return new Response(JSON.stringify({ error: 'Invalid payload structure' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const paymentId = payment.id;
      const amount = payment.amount;
      const notes = payment.notes || {};
      const email = notes.user_email || payment.email;

      const maskedEmail = email ? `${email.slice(0, 2)}***@${email.split('@')[1] || '?'}` : 'unknown';
      console.log(`Payment captured: ${paymentId}, email: ${maskedEmail}, amount: ${amount}`);

      if (!email) {
        await logPayment(supabase, 'payment.captured', null, paymentId, amount, 'error', 'No email found', null, false, null);
        return new Response(JSON.stringify({ error: 'No email in payment' }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      let userId: string | null = null;
      try {
        userId = await findUserByEmail(supabase, email);
      } catch (err) {
        console.error('Error fetching profile:', err);
        await logPayment(supabase, 'payment.captured', email, paymentId, amount, 'error', 'Failed to fetch profile', null, false, null);
        return new Response(JSON.stringify({ error: 'Failed to fetch user profile' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      if (!userId) {
        await logPayment(supabase, 'payment.captured', email, paymentId, amount, 'error', 'User not found', null, false, null);
        return new Response(JSON.stringify({ error: 'User not found' }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const durationDays = notes.duration_days ? parseInt(notes.duration_days) : null;
      const planScope = notes.plan_scope || 'app';
      const tier = notes.tier || 'pro'; // Default to 'pro' for backward compat
      
      if (!durationDays) {
        await logPayment(supabase, 'payment.captured', email, paymentId, amount, 'error', 'Missing duration_days in notes', userId, true, null);
        return new Response(JSON.stringify({ error: 'Missing duration_days' }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const now = new Date();
      const expiresAt = new Date(now);
      expiresAt.setDate(expiresAt.getDate() + durationDays);

      try {
        await activateSubscription(supabase, userId, planScope, {
          plan: 'pro',
          tier: tier,
          status: 'active',
          subscribed_at: now.toISOString(),
          expires_at: expiresAt.toISOString(),
          payment_id: paymentId,
          updated_at: now.toISOString(),
        });

        console.log(`Tier ${tier} activated (${durationDays} days, scope: ${planScope}) for user: ${userId}`);
        await logPayment(supabase, 'payment.captured', email, paymentId, amount, 'success', `${tier} ${planScope} (${durationDays} days)`, userId, true, null);
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
        user_id: userId,
        plan: 'pro',
        duration_days: durationDays,
        expires_at: expiresAt.toISOString()
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // =========================================
    // RECURRING: subscription.activated
    // =========================================
    if (event === 'subscription.activated') {
      const subscription = payload.payload?.subscription?.entity;
      if (!subscription) {
        return new Response(JSON.stringify({ error: 'Invalid payload' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const subId = subscription.id;
      const notes = subscription.notes || {};
      const email = notes.user_email;
      const razorpayPlanId = subscription.plan_id;

      console.log(`Subscription activated: ${subId}, email: ${email}, plan: ${razorpayPlanId}`);

      if (!email) {
        await logPayment(supabase, 'subscription.activated', null, subId, null, 'error', 'No email in notes', null, false, null);
        return new Response(JSON.stringify({ error: 'No email' }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const userId = await findUserByEmail(supabase, email);
      if (!userId) {
        await logPayment(supabase, 'subscription.activated', email, subId, null, 'error', 'User not found', null, false, null);
        return new Response(JSON.stringify({ error: 'User not found' }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // Look up duration and tier from plan config
      let durationDays = notes.duration_days ? parseInt(notes.duration_days) : null;
      let planScope = notes.plan_scope || 'app';
      let tier = notes.tier || 'pro';

      if (razorpayPlanId) {
        const planInfo = await lookupPlanByRazorpayId(supabase, razorpayPlanId);
        if (planInfo) {
          if (!durationDays) durationDays = planInfo.duration_days;
          planScope = planInfo.plan_scope;
          tier = planInfo.tier;
        }
      }

      if (!durationDays) {
        await logPayment(supabase, 'subscription.activated', email, subId, null, 'error', 'Missing duration_days', userId, true, null);
        return new Response(JSON.stringify({ error: 'Missing duration' }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const now = new Date();
      const expiresAt = new Date(now);
      expiresAt.setDate(expiresAt.getDate() + durationDays);

      try {
        await activateSubscription(supabase, userId, planScope, {
          plan: 'pro',
          tier: tier,
          status: 'active',
          subscribed_at: now.toISOString(),
          expires_at: expiresAt.toISOString(),
          razorpay_subscription_id: subId,
          updated_at: now.toISOString(),
        });

        console.log(`Subscription tier ${tier} activated (${durationDays} days, scope: ${planScope}) for user: ${userId}`);
        await logPayment(supabase, 'subscription.activated', email, subId, null, 'success', `Sub ${tier} ${planScope} (${durationDays} days)`, userId, true, null);
      } catch (err) {
        console.error('Error activating subscription:', err);
        await logPayment(supabase, 'subscription.activated', email, subId, null, 'error', 'Failed to activate', userId, true, null);
      }

      return new Response(JSON.stringify({ success: true }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // =========================================
    // RECURRING: subscription.charged (renewal)
    // =========================================
    if (event === 'subscription.charged') {
      const subscription = payload.payload?.subscription?.entity;
      const payment = payload.payload?.payment?.entity;
      if (!subscription) {
        return new Response(JSON.stringify({ error: 'Invalid payload' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const subId = subscription.id;
      const razorpayPlanId = subscription.plan_id;
      const notes = subscription.notes || {};
      const email = notes.user_email;
      const paymentId = payment?.id || null;
      const amount = payment?.amount || null;

      console.log(`Subscription charged: ${subId}, payment: ${paymentId}`);

      // Get duration and tier from plan config
      let durationDays = notes.duration_days ? parseInt(notes.duration_days) : null;
      let planScope = notes.plan_scope || 'app';

      if (razorpayPlanId) {
        const planInfo = await lookupPlanByRazorpayId(supabase, razorpayPlanId);
        if (planInfo) {
          if (!durationDays) durationDays = planInfo.duration_days;
          planScope = planInfo.plan_scope;
        }
      }

      if (!durationDays) {
        await logPayment(supabase, 'subscription.charged', email, paymentId, amount, 'error', 'Missing duration', null, false, null);
        return new Response(JSON.stringify({ error: 'Missing duration' }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // Find user by razorpay_subscription_id
      const tables = planScope === 'funnels' ? ['user_funnel_subscriptions'] : 
                     planScope === 'combined' ? ['user_subscriptions', 'user_funnel_subscriptions'] : 
                     ['user_subscriptions'];

      for (const table of tables) {
        const { data: sub } = await supabase
          .from(table)
          .select('user_id, expires_at')
          .eq('razorpay_subscription_id', subId)
          .maybeSingle();

        if (sub) {
          // Extend expiry from current expiry or now, whichever is later
          const currentExpiry = sub.expires_at ? new Date(sub.expires_at) : new Date();
          const base = currentExpiry > new Date() ? currentExpiry : new Date();
          const newExpiry = new Date(base);
          newExpiry.setDate(newExpiry.getDate() + durationDays);

          const { error } = await supabase
            .from(table)
            .update({
              expires_at: newExpiry.toISOString(),
              status: 'active',
              updated_at: new Date().toISOString(),
            })
            .eq('razorpay_subscription_id', subId);

          if (error) console.error(`Error extending ${table}:`, error);
          else console.log(`Extended ${table} by ${durationDays} days for sub ${subId}`);
        }
      }

      await logPayment(supabase, 'subscription.charged', email, paymentId, amount, 'success', `Renewal +${durationDays} days`, null, true, null);
      return new Response(JSON.stringify({ success: true }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // =========================================
    // RECURRING: subscription.cancelled
    // =========================================
    if (event === 'subscription.cancelled') {
      const subscription = payload.payload?.subscription?.entity;
      if (!subscription) {
        return new Response(JSON.stringify({ error: 'Invalid payload' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const subId = subscription.id;
      console.log(`Subscription cancelled: ${subId}`);

      // Update status in both tables (whichever has this subscription)
      for (const table of ['user_subscriptions', 'user_funnel_subscriptions']) {
        await supabase
          .from(table)
          .update({ status: 'cancelled', updated_at: new Date().toISOString() })
          .eq('razorpay_subscription_id', subId);
      }

      await logPayment(supabase, 'subscription.cancelled', null, subId, null, 'success', 'Subscription cancelled', null, true, null);
      return new Response(JSON.stringify({ success: true }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // =========================================
    // RECURRING: subscription.completed
    // =========================================
    if (event === 'subscription.completed') {
      const subscription = payload.payload?.subscription?.entity;
      if (!subscription) {
        return new Response(JSON.stringify({ error: 'Invalid payload' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const subId = subscription.id;
      console.log(`Subscription completed: ${subId}`);

      for (const table of ['user_subscriptions', 'user_funnel_subscriptions']) {
        await supabase
          .from(table)
          .update({ status: 'expired', tier: 'basic', updated_at: new Date().toISOString() })
          .eq('razorpay_subscription_id', subId);
      }

      await logPayment(supabase, 'subscription.completed', null, subId, null, 'success', 'Subscription completed', null, true, null);
      return new Response(JSON.stringify({ success: true }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
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
