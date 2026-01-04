import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Get auth header to verify caller
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create client with user's token to verify they're admin
    const supabaseUser = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } }
    });

    // Get current user
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user is admin using RPC
    const { data: isAdmin, error: adminError } = await supabaseUser.rpc('has_role', {
      _user_id: user.id,
      _role: 'admin'
    });

    if (adminError || !isAdmin) {
      console.log('Admin check failed:', adminError, 'isAdmin:', isAdmin);
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const { user_id, plan, duration_days } = await req.json();

    if (!user_id) {
      return new Response(
        JSON.stringify({ error: 'user_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!plan || !['free', 'pro'].includes(plan)) {
      return new Response(
        JSON.stringify({ error: 'plan must be "free" or "pro"' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use service role client for updates
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Calculate expiry date
    let expiresAt: string | null = null;
    if (plan === 'pro' && duration_days) {
      const expiry = new Date();
      expiry.setDate(expiry.getDate() + parseInt(duration_days));
      expiresAt = expiry.toISOString();
    }

    // Check if subscription exists
    const { data: existing } = await supabaseAdmin
      .from('user_subscriptions')
      .select('id')
      .eq('user_id', user_id)
      .maybeSingle();

    let result;
    const updateData = {
      plan,
      status: plan === 'pro' ? 'active' : 'free',
      is_admin_override: plan === 'pro',
      expires_at: expiresAt,
      subscribed_at: plan === 'pro' ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    };

    if (existing) {
      // Update existing subscription
      const { data, error } = await supabaseAdmin
        .from('user_subscriptions')
        .update(updateData)
        .eq('user_id', user_id)
        .select()
        .single();

      if (error) throw error;
      result = data;
    } else {
      // Create new subscription
      const { data, error } = await supabaseAdmin
        .from('user_subscriptions')
        .insert({ user_id, ...updateData })
        .select()
        .single();

      if (error) throw error;
      result = data;
    }

    console.log(`Admin ${user.email} updated subscription for ${user_id}: plan=${plan}, expires_at=${expiresAt}`);

    return new Response(
      JSON.stringify({ success: true, subscription: result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error updating subscription:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
