import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildCorsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  const corsHeaders = buildCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const userId = user.id;

    const { user_id, user_email, plan_type } = await req.json();

    if (user_id !== userId) {
      return new Response(JSON.stringify({ error: 'User mismatch' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch plan from DB using service role
    const serviceClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data: plan, error: planError } = await serviceClient
      .from('admin_subscription_plans')
      .select('*')
      .eq('plan_key', plan_type)
      .eq('is_active', true)
      .single();

    if (planError || !plan) {
      return new Response(JSON.stringify({ error: 'Plan not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (plan.billing_type !== 'recurring') {
      return new Response(JSON.stringify({ error: 'Plan is not a recurring plan' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!plan.razorpay_plan_id) {
      return new Response(JSON.stringify({ error: 'Razorpay plan ID not configured' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Determine plan_scope from plan_key
    let planScope = 'app';
    if (plan.plan_key.startsWith('funnels_')) planScope = 'funnels';
    if (plan.plan_key.startsWith('combined_')) planScope = 'combined';

    const tier = plan.tier || 'pro'; // 3-tier support

    // Create Razorpay subscription
    const razorpayKeyId = Deno.env.get('RAZORPAY_KEY_ID')!;
    const razorpayKeySecret = Deno.env.get('RAZORPAY_KEY_SECRET')!;
    const auth = btoa(`${razorpayKeyId}:${razorpayKeySecret}`);

    const subscriptionPayload = {
      plan_id: plan.razorpay_plan_id,
      total_count: 12, // Max 12 billing cycles
      quantity: 1,
      notes: {
        user_id: user_id,
        user_email: user_email,
        plan_scope: planScope,
        tier: tier,
        plan_key: plan.plan_key,
        duration_days: String(plan.duration_days),
      },
    };

    const rzpResponse = await fetch('https://api.razorpay.com/v1/subscriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(subscriptionPayload),
    });

    const rzpData = await rzpResponse.json();

    if (!rzpResponse.ok) {
      console.error('Razorpay subscription creation failed:', rzpData);
      return new Response(JSON.stringify({ error: rzpData.error?.description || 'Failed to create subscription' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Razorpay subscription created:', rzpData.id);

    return new Response(JSON.stringify({
      subscription_id: rzpData.id,
      short_url: rzpData.short_url,
      key_id: razorpayKeyId,
      status: rzpData.status,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
