import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface LeadPayload {
  funnel_id: string;
  name: string;
  phone?: string;
  email?: string;
  source?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload: LeadPayload = await req.json();
    
    // Validate required fields
    if (!payload.funnel_id || !payload.name) {
      return new Response(
        JSON.stringify({ error: 'funnel_id and name are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch the funnel to get owner_user_id and validate it exists
    const { data: funnel, error: funnelError } = await supabase
      .from('funnels')
      .select('id, owner_user_id, is_published')
      .eq('id', payload.funnel_id)
      .single();

    if (funnelError || !funnel) {
      console.error('Funnel lookup error:', funnelError);
      return new Response(
        JSON.stringify({ error: 'Funnel not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if funnel is published
    if (!funnel.is_published) {
      return new Response(
        JSON.stringify({ error: 'This funnel is not available' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate access token for the lead
    const accessToken = crypto.randomUUID();
    const tokenExpiresAt = new Date();
    tokenExpiresAt.setDate(tokenExpiresAt.getDate() + 7); // Token valid for 7 days

    // Get IP and user agent for abuse tracking
    const ipAddress = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
                      req.headers.get('cf-connecting-ip') || 
                      'unknown';
    const userAgent = req.headers.get('user-agent') || 'unknown';

    // Check for existing lead with same phone or email in this funnel
    let existingLead = null;
    
    if (payload.phone) {
      const { data } = await supabase
        .from('funnel_leads')
        .select('id, access_token, access_token_expires_at')
        .eq('funnel_id', payload.funnel_id)
        .eq('phone', payload.phone)
        .maybeSingle();
      existingLead = data;
    }
    
    if (!existingLead && payload.email) {
      const { data } = await supabase
        .from('funnel_leads')
        .select('id, access_token, access_token_expires_at')
        .eq('funnel_id', payload.funnel_id)
        .eq('email', payload.email)
        .maybeSingle();
      existingLead = data;
    }

    if (existingLead) {
      // Update existing lead with new token if expired or about to expire
      const existingExpiry = existingLead.access_token_expires_at 
        ? new Date(existingLead.access_token_expires_at) 
        : new Date(0);
      const now = new Date();
      
      if (existingExpiry <= now || (existingExpiry.getTime() - now.getTime()) < 24 * 60 * 60 * 1000) {
        // Token expired or expires within 24 hours, update it
        const { error: updateError } = await supabase
          .from('funnel_leads')
          .update({
            name: payload.name,
            access_token: accessToken,
            access_token_expires_at: tokenExpiresAt.toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingLead.id);

        if (updateError) {
          console.error('Lead update error:', updateError);
          return new Response(
            JSON.stringify({ error: 'Failed to update lead' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log(`Updated existing lead ${existingLead.id} with new token`);
        
        return new Response(
          JSON.stringify({ 
            success: true, 
            lead_id: existingLead.id,
            token: accessToken,
            is_existing: true
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } else {
        // Token still valid, return existing
        console.log(`Returning existing lead ${existingLead.id} with valid token`);
        
        return new Response(
          JSON.stringify({ 
            success: true, 
            lead_id: existingLead.id,
            token: existingLead.access_token,
            is_existing: true
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Create new lead with CORRECT column names: access_token, access_token_expires_at
    const { data: newLead, error: insertError } = await supabase
      .from('funnel_leads')
      .insert({
        funnel_id: payload.funnel_id,
        owner_user_id: funnel.owner_user_id,
        name: payload.name,
        phone: payload.phone || null,
        email: payload.email || null,
        source: payload.source || 'direct',
        access_token: accessToken,
        access_token_expires_at: tokenExpiresAt.toISOString(),
        ip_address: ipAddress,
        user_agent: userAgent,
      })
      .select('id')
      .single();

    if (insertError) {
      console.error('Lead insert error:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to create lead', details: insertError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Created new lead ${newLead.id} for funnel ${payload.funnel_id}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        lead_id: newLead.id,
        token: accessToken,
        is_existing: false
      }),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Unexpected error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
