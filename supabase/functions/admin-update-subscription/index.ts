import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildCorsHeaders } from "../_shared/cors.ts";

// Simple in-memory rate limiter for admin actions
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 20;

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(userId);
  
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  
  if (entry.count >= RATE_LIMIT_MAX_REQUESTS) {
    console.warn(`Rate limit exceeded for admin: ${userId}`);
    return false;
  }
  
  entry.count++;
  return true;
}

const VALID_TIERS = ['basic', 'pro', 'premium'];

serve(async (req) => {
  const corsHeaders = buildCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUser = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!checkRateLimit(user.id)) {
      return new Response(
        JSON.stringify({ error: 'Too many requests. Please wait a moment before trying again.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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

    const { user_id, plan, duration_days, tier } = await req.json();

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

    // Validate tier if provided
    if (tier && !VALID_TIERS.includes(tier)) {
      return new Response(
        JSON.stringify({ error: 'tier must be "basic", "pro", or "premium"' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    let expiresAt: string | null = null;
    if (plan === 'pro' && duration_days) {
      const expiry = new Date();
      expiry.setDate(expiry.getDate() + parseInt(duration_days));
      expiresAt = expiry.toISOString();
    }

    // Determine tier: when revoking (plan=free) -> basic, when granting use provided tier or default to 'pro'
    const effectiveTier = plan === 'free' ? 'basic' : (tier || 'pro');

    const { data: existing } = await supabaseAdmin
      .from('user_subscriptions')
      .select('id')
      .eq('user_id', user_id)
      .maybeSingle();

    let result;
    const updateData = {
      plan,
      tier: effectiveTier,
      status: plan === 'pro' ? 'active' : 'free',
      is_admin_override: plan === 'pro',
      expires_at: expiresAt,
      subscribed_at: plan === 'pro' ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    };

    if (existing) {
      const { data, error } = await supabaseAdmin
        .from('user_subscriptions')
        .update(updateData)
        .eq('user_id', user_id)
        .select()
        .single();

      if (error) throw error;
      result = data;
    } else {
      const { data, error } = await supabaseAdmin
        .from('user_subscriptions')
        .insert({ user_id, ...updateData })
        .select()
        .single();

      if (error) throw error;
      result = data;
    }

    console.log(`Admin ${user.email} updated subscription for ${user_id}: plan=${plan}, tier=${effectiveTier}, expires_at=${expiresAt}`);

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
