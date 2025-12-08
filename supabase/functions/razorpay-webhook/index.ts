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

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

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

      const email = payment.email;
      const paymentId = payment.id;
      const amount = payment.amount; // in paise

      console.log(`Payment captured: ${paymentId}, email: ${email}, amount: ${amount}`);

      if (!email) {
        console.error('No email in payment entity');
        return new Response(JSON.stringify({ error: 'No email in payment' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Initialize Supabase client with service role
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      // Find the user by email
      const { data: userData, error: userError } = await supabase.auth.admin.listUsers();
      
      if (userError) {
        console.error('Error fetching users:', userError);
        return new Response(JSON.stringify({ error: 'Failed to fetch users' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const user = userData.users.find(u => u.email?.toLowerCase() === email.toLowerCase());
      
      if (!user) {
        console.error(`User not found for email: ${email}`);
        return new Response(JSON.stringify({ error: 'User not found' }), {
          status: 404,
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
          return new Response(JSON.stringify({ error: 'Failed to update subscription' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        console.log(`Updated subscription to Pro for user: ${user.id}`);
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
          return new Response(JSON.stringify({ error: 'Failed to create subscription' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        console.log(`Created Pro subscription for user: ${user.id}`);
      }

      return new Response(JSON.stringify({ 
        success: true, 
        message: 'User marked as Pro',
        user_id: user.id,
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
