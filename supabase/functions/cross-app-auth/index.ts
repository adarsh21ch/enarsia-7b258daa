import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cross-app-secret',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Only accept POST requests
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ success: false, error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate cross-app secret (app-to-app authentication)
    const crossAppSecret = req.headers.get('x-cross-app-secret');
    const expectedSecret = Deno.env.get('CROSS_APP_SECRET');
    
    if (!crossAppSecret || crossAppSecret !== expectedSecret) {
      console.error('Invalid or missing cross-app secret');
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized - Invalid credentials' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const body = await req.json();
    const { email, emails, nevorai_user_id, action } = body;

    console.log('cross-app-auth called with action:', action);

    // Validate action
    if (action !== 'get_leader_ids') {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid action. Only "get_leader_ids" is supported.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate input - need either email, emails array, or nevorai_user_id
    if (!email && !nevorai_user_id && (!emails || !Array.isArray(emails) || emails.length === 0)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Either email, emails array, or nevorai_user_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase admin client for database access
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // BATCH MODE: Process multiple emails
    if (emails && Array.isArray(emails) && emails.length > 0) {
      console.log(`Batch lookup for ${emails.length} emails`);
      
      // Normalize emails
      const normalizedEmails = emails.map((e: string) => e.toLowerCase().trim());
      
      // Single query for all emails using .in()
      const { data: profiles, error: batchError } = await supabaseAdmin
        .from('profiles')
        .select('user_id, neverai_id, email, display_name')
        .in('email', normalizedEmails);

      if (batchError) {
        console.error('Batch database error:', batchError.message);
        return new Response(
          JSON.stringify({ success: false, error: 'Database lookup failed' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Create a map of found profiles by email
      const profileMap = new Map(
        (profiles || []).map(p => [p.email?.toLowerCase(), p])
      );

      // Build results array - include ALL requested emails (even if not found)
      const results = normalizedEmails.map((requestedEmail: string) => {
        const profile = profileMap.get(requestedEmail);
        if (profile) {
          return {
            email: requestedEmail,
            nevorai_user_id: profile.user_id,
            leader_id: profile.neverai_id,
            display_name: profile.display_name
          };
        } else {
          return {
            email: requestedEmail,
            nevorai_user_id: null,
            leader_id: null,
            display_name: null
          };
        }
      });

      const foundCount = results.filter(r => r.leader_id !== null).length;
      console.log(`Batch complete: ${foundCount}/${emails.length} users found`);

      // Format for Achievers Club compatibility - only include found users with leader_ids
      const leader_ids = results
        .filter(r => r.leader_id !== null)
        .map(r => ({ email: r.email, leader_id: r.leader_id }));

      // Always return 200 with partial results
      return new Response(
        JSON.stringify({
          success: true,
          leader_ids,
          results,
          summary: {
            requested: emails.length,
            found: foundCount,
            not_found: emails.length - foundCount
          }
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // SINGLE MODE: Process single email or nevorai_user_id (backward compatible)
    let query = supabaseAdmin
      .from('profiles')
      .select('user_id, neverai_id, email, display_name');

    if (email) {
      query = query.eq('email', email.toLowerCase().trim());
      console.log('Looking up user by email:', email);
    } else if (nevorai_user_id) {
      query = query.eq('user_id', nevorai_user_id);
      console.log('Looking up user by user_id:', nevorai_user_id);
    }

    const { data: profile, error: profileError } = await query.maybeSingle();

    if (profileError) {
      console.error('Database error:', profileError.message);
      return new Response(
        JSON.stringify({ success: false, error: 'Database lookup failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!profile) {
      console.log('User not found for:', email || nevorai_user_id);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'User not found in NevorAI',
          nevorai_user_id: null,
          leader_id: null
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('User found:', profile.user_id, 'leader_id:', profile.neverai_id);

    // Return READ-ONLY data
    return new Response(
      JSON.stringify({
        success: true,
        nevorai_user_id: profile.user_id,
        leader_id: profile.neverai_id,
        display_name: profile.display_name
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
