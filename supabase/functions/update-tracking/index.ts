import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Auth: get user from JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    // Create anon client to verify JWT
    const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await anonClient.auth.getUser();
    if (userError || !user) {
      console.error('Auth error:', userError);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Service role client for bypassing RLS
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    const { action } = body;

    // Resolve effective write target. When on_behalf_of_user_id is set, the caller
    // (a leader) is writing for a downline member. Validate via SECURITY DEFINER
    // can_leader_view_member; only direct downline is allowed. Reject otherwise.
    let effectiveUserId = user.id;
    if (body.on_behalf_of_user_id && body.on_behalf_of_user_id !== user.id) {
      const { data: allowed, error: rpcErr } = await adminClient.rpc('can_leader_view_member', {
        p_leader_user_id: user.id,
        p_member_user_id: body.on_behalf_of_user_id,
      });
      if (rpcErr || !allowed) {
        console.warn(`on-behalf write denied: ${user.id} -> ${body.on_behalf_of_user_id}`, rpcErr);
        return new Response(JSON.stringify({ error: 'Forbidden: not your direct downline' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      effectiveUserId = body.on_behalf_of_user_id;
    }

    console.log(`update-tracking: action=${action} caller=${user.id} target=${effectiveUserId} date=${body.date}`);

    if (action === 'save_personal') {
      return await savePersonal(adminClient, effectiveUserId, body);
    } else if (action === 'save_total_manual') {
      return await saveTotalManual(adminClient, effectiveUserId, body);
    } else if (action === 'save_total_automated') {
      // Aggregation always runs as the caller; on-behalf not supported here.
      return await saveTotalAutomated(adminClient, user.id, body);
    } else {
      return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  } catch (err) {
    console.error('update-tracking error:', err);
    return new Response(JSON.stringify({ error: err.message || 'Internal error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function savePersonal(adminClient: any, userId: string, body: any) {
  const {
    date,
    source = 'MANUAL',
    total_leads = 0,
    total_responses = 0,
    response_tags = {},
    stage_tags = {},
    final_tag = null,
    final_tag_count = 0,
    funnel_tag = null,
    funnel_tag_count = 0,
    funnel_start_date = null,
    funnel_day = null,
    upline_leader_id = null,
  } = body;

  if (!date) {
    return new Response(JSON.stringify({ error: 'date is required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { data, error } = await adminClient
    .from('personal_snapshot_v2')
    .upsert(
      {
        user_id: userId,
        date,
        source,
        total_leads,
        total_responses,
        response_tags,
        stage_tags,
        final_tag,
        final_tag_count,
        funnel_tag,
        funnel_tag_count,
        funnel_start_date,
        funnel_day,
        upline_leader_id,
      },
      { onConflict: 'user_id,date' }
    )
    .select()
    .single();

  if (error) {
    console.error('Error upserting personal snapshot:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  console.log(`Saved personal snapshot for ${userId} on ${date}`);
  return new Response(JSON.stringify({ success: true, data }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function saveTotalManual(adminClient: any, userId: string, body: any) {
  const {
    date,
    total_leads = 0,
    total_responses = 0,
    response_tags = {},
    stage_tags = {},
    final_tag = null,
    final_tag_count = 0,
    funnel_tag = null,
    funnel_tag_count = 0,
    funnel_start_date = null,
    funnel_day = null,
    upline_leader_id = null,
  } = body;

  if (!date) {
    return new Response(JSON.stringify({ error: 'date is required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { data, error } = await adminClient
    .from('total_snapshot_v2')
    .upsert(
      {
        user_id: userId,
        date,
        source: 'MANUAL',
        total_leads,
        total_responses,
        response_tags,
        stage_tags,
        final_tag,
        final_tag_count,
        funnel_tag,
        funnel_tag_count,
        funnel_start_date,
        funnel_day,
        upline_leader_id,
      },
      { onConflict: 'user_id,date' }
    )
    .select()
    .single();

  if (error) {
    console.error('Error upserting total snapshot (manual):', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  console.log(`Saved total manual snapshot for ${userId} on ${date}`);
  return new Response(JSON.stringify({ success: true, data }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function saveTotalAutomated(adminClient: any, userId: string, body: any) {
  const { date, member_user_ids = [] } = body;

  if (!date) {
    return new Response(JSON.stringify({ error: 'date is required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // SECURITY: validate that every requested member is actually in the
  // authenticated user's downline. Reject silently for IDs that aren't —
  // never aggregate data for users the caller can't see.
  let validatedMemberIds: string[] = [];
  if (Array.isArray(member_user_ids) && member_user_ids.length > 0) {
    const { data: downline } = await adminClient
      .from('personal_snapshot_v2')
      .select('user_id')
      .in('user_id', member_user_ids)
      .eq('upline_leader_id', userId);
    validatedMemberIds = Array.from(new Set((downline || []).map((r: any) => r.user_id)));
  }

  // Aggregate the caller's own snapshot plus validated downline members only
  const allMemberIds = [userId, ...validatedMemberIds];

  const { data: memberSnapshots, error: fetchError } = await adminClient
    .from('personal_snapshot_v2')
    .select('*')
    .in('user_id', allMemberIds)
    .eq('date', date);

  if (fetchError) {
    console.error('Error fetching member snapshots:', fetchError);
    return new Response(JSON.stringify({ error: fetchError.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Aggregate
  let totalLeads = 0;
  let totalResponses = 0;
  let finalTagCount = 0;
  const responseTags: Record<string, number> = {};
  const stageTags: Record<string, number> = {};

  (memberSnapshots || []).forEach((snap: any) => {
    totalLeads += snap.total_leads || 0;
    totalResponses += snap.total_responses || 0;
    finalTagCount += snap.final_tag_count || 0;

    if (snap.response_tags && typeof snap.response_tags === 'object') {
      Object.entries(snap.response_tags).forEach(([key, val]) => {
        responseTags[key] = (responseTags[key] || 0) + (val as number || 0);
      });
    }
    if (snap.stage_tags && typeof snap.stage_tags === 'object') {
      Object.entries(snap.stage_tags).forEach(([key, val]) => {
        stageTags[key] = (stageTags[key] || 0) + (val as number || 0);
      });
    }
  });

  const { data, error } = await adminClient
    .from('total_snapshot_v2')
    .upsert(
      {
        user_id: userId,
        date,
        source: 'TEAM_MEMBERS',
        total_leads: totalLeads,
        total_responses: totalResponses,
        response_tags: responseTags,
        stage_tags: stageTags,
        final_tag: body.final_tag || null,
        final_tag_count: finalTagCount,
        funnel_tag: body.funnel_tag || null,
        funnel_tag_count: body.funnel_tag_count || 0,
        funnel_start_date: body.funnel_start_date || null,
        funnel_day: body.funnel_day || null,
        upline_leader_id: body.upline_leader_id || null,
      },
      { onConflict: 'user_id,date' }
    )
    .select()
    .single();

  if (error) {
    console.error('Error upserting total snapshot (automated):', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  console.log(`Saved total automated snapshot for ${userId} on ${date}: ${allMemberIds.length} members aggregated`);
  return new Response(JSON.stringify({ success: true, data, membersAggregated: allMemberIds.length }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
