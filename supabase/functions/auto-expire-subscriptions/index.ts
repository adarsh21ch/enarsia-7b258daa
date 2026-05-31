// Daily job: marks any user_subscriptions row whose expires_at is in the past
// as status='expired' and plan='free'. This catches users who never log in.
// Client-side gating already treats expired subs as free, but this keeps the
// admin panel and DB filters truthful without manual revoke.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  // Cron-secret guard — only the scheduled cron should mutate subscription rows.
  const cronSecret = Deno.env.get('CRON_SECRET');
  const authHeader = req.headers.get('Authorization') || req.headers.get('authorization');
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const nowIso = new Date().toISOString();

    // Skip admin overrides — those are intentionally evergreen
    const { data, error } = await supabase
      .from('user_subscriptions')
      .update({ status: 'expired', plan: 'free', tier: 'basic' })
      .eq('status', 'active')
      .neq('plan', 'free')
      .eq('is_admin_override', false)
      .lt('expires_at', nowIso)
      .select('user_id, expires_at');

    if (error) throw error;

    return new Response(
      JSON.stringify({ ok: true, expired_count: data?.length ?? 0, ran_at: nowIso }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('auto-expire-subscriptions error:', err);
    return new Response(
      JSON.stringify({ ok: false, error: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
