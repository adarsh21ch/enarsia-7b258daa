import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-lead-token',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const {
      lead_id,
      funnel_id,
      price_option_id,
      amount,
      screenshot_url,
      access_token,
      // Optional contact fields for creating new leads
      contact_name,
      contact_phone,
      contact_email,
    } = body;

    // Require funnel_id, amount, and screenshot_url
    if (!funnel_id || !amount || !screenshot_url) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: funnel_id, amount, screenshot_url' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      return new Response(
        JSON.stringify({ error: 'Invalid amount' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Server-side price validation — prevent amount tampering
    if (price_option_id) {
      const { data: priceOpt, error: priceErr } = await supabase
        .from('funnel_price_options')
        .select('amount, funnel_id')
        .eq('id', price_option_id)
        .single();
      if (priceErr || !priceOpt || priceOpt.funnel_id !== funnel_id) {
        return new Response(
          JSON.stringify({ error: 'Invalid price option' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (Number(priceOpt.amount) !== numericAmount) {
        return new Response(
          JSON.stringify({ error: 'Amount does not match the selected price option' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else {
      // No price option chosen — fall back to funnel's configured price if any
      const { data: funnelRow } = await supabase
        .from('funnels')
        .select('price')
        .eq('id', funnel_id)
        .single();
      const configured = funnelRow?.price != null ? Number(funnelRow.price) : null;
      if (configured != null && configured > 0 && configured !== numericAmount) {
        return new Response(
          JSON.stringify({ error: 'Amount does not match the funnel price' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    let effectiveLeadId = lead_id;
    let ownerUserId: string | null = null;

    // If lead_id provided, verify it exists AND the caller holds the access_token
    if (lead_id) {
      if (!access_token) {
        return new Response(
          JSON.stringify({ error: 'access_token is required when submitting against an existing lead' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: lead, error: leadError } = await supabase
        .from('funnel_leads')
        .select('id, funnel_id, owner_user_id, access_token')
        .eq('id', lead_id)
        .single();

      if (leadError || !lead || lead.access_token !== access_token) {
        return new Response(
          JSON.stringify({ error: 'Invalid lead or access token' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      ownerUserId = lead.owner_user_id;
    } else {
      // No lead_id - check if we have contact info to create one
      if (!contact_name && !contact_phone && !contact_email) {
        return new Response(
          JSON.stringify({ error: 'Either lead_id or contact info (name/phone/email) is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get funnel owner
      const { data: funnel, error: funnelError } = await supabase
        .from('funnels')
        .select('id, owner_user_id')
        .eq('id', funnel_id)
        .single();

      if (funnelError || !funnel) {
        return new Response(
          JSON.stringify({ error: 'Funnel not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      ownerUserId = funnel.owner_user_id;

      // Check if a lead with this phone/email already exists for this funnel
      let existingLead = null;
      if (contact_phone) {
        const { data } = await supabase
          .from('funnel_leads')
          .select('id')
          .eq('funnel_id', funnel_id)
          .eq('phone', contact_phone)
          .single();
        existingLead = data;
      }
      if (!existingLead && contact_email) {
        const { data } = await supabase
          .from('funnel_leads')
          .select('id')
          .eq('funnel_id', funnel_id)
          .eq('email', contact_email)
          .single();
        existingLead = data;
      }

      if (existingLead) {
        effectiveLeadId = existingLead.id;
      } else {
        // Create new lead with source 'payment_direct'
        const accessToken = crypto.randomUUID();
        const { data: newLead, error: createError } = await supabase
          .from('funnel_leads')
          .insert({
            funnel_id,
            owner_user_id: ownerUserId,
            name: contact_name || 'Unknown',
            phone: contact_phone || null,
            email: contact_email || null,
            source: 'payment_direct',
            access_token: accessToken,
            video_watch_percent: 0,
            video_completed: false,
          })
          .select()
          .single();

        if (createError) {
          console.error('Failed to create lead:', createError);
          return new Response(
            JSON.stringify({ error: 'Failed to create lead record' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        effectiveLeadId = newLead.id;
        console.log('Created new lead for direct payment:', { leadId: newLead.id, source: 'payment_direct' });
      }
    }

    // Create payment record with pending status
    const { data: payment, error: paymentError } = await supabase
      .from('funnel_payments')
      .insert({
        lead_id: effectiveLeadId,
        funnel_id,
        owner_user_id: ownerUserId,
        provider: 'manual',
        amount,
        currency: 'INR',
        status: 'pending',
        upi_screenshot_url: screenshot_url,
      })
      .select()
      .single();

    if (paymentError) {
      console.error('Failed to create payment:', paymentError);
      return new Response(
        JSON.stringify({ error: 'Failed to record payment' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Payment proof submitted:', {
      paymentId: payment.id,
      leadId: effectiveLeadId,
      funnelId: funnel_id,
      amount,
      hadExistingLead: !!lead_id,
    });

    return new Response(
      JSON.stringify({
        success: true,
        payment_id: payment.id,
        lead_id: effectiveLeadId,
        status: 'pending',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
