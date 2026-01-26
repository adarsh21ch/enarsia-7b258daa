import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cross-app-secret',
};

const jsonResponse = (data: object, status = 200) => 
  new Response(JSON.stringify(data), { 
    status, 
    headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
  });

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate secret
    const providedSecret = req.headers.get('x-cross-app-secret');
    const expectedSecret = Deno.env.get('CROSS_APP_SECRET');
    
    if (!providedSecret || providedSecret !== expectedSecret) {
      console.error('Unauthorized: Invalid or missing x-cross-app-secret');
      return jsonResponse({ success: false, error: 'Unauthorized' }, 401);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { action, ...requestBody } = await req.json();
    console.log('cross-app-auth action:', action);

    switch (action) {
      // ACTION: get_leader_ids (batch lookup - READ ONLY) - Legacy support
      case 'get_leader_ids': {
        const { emails } = requestBody;
        
        if (!Array.isArray(emails) || emails.length === 0) {
          return jsonResponse({ success: false, error: 'emails array required' }, 400);
        }

        const normalizedEmails = emails.map((e: string) => e.toLowerCase().trim());
        
        const { data, error } = await supabase
          .from('profiles')
          .select('email, neverai_id')
          .in('email', normalizedEmails);

        if (error) {
          console.error('Query error:', error);
          return jsonResponse({ success: false, error: error.message }, 500);
        }

        // Map neverai_id to leader_id for Achievers Club compatibility
        const leader_ids = (data || []).map(p => ({
          email: p.email,
          leader_id: p.neverai_id
        }));

        console.log(`Found ${leader_ids.length}/${emails.length} leader_ids`);
        return jsonResponse({ success: true, leader_ids });
      }

      // ACTION: get_user_by_email (NEW - lookup user by email)
      case 'get_user_by_email': {
        const { email } = requestBody;
        
        if (!email) {
          return jsonResponse({ success: false, error: 'email required' }, 400);
        }

        const normalizedEmail = email.toLowerCase().trim();
        
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('user_id, email, display_name, neverai_id')
          .eq('email', normalizedEmail)
          .maybeSingle();

        if (error) {
          console.error('Query error:', error);
          return jsonResponse({ success: false, error: error.message }, 500);
        }

        if (!profile) {
          return jsonResponse({ success: false, error: 'User not found' }, 404);
        }

        console.log('Found user by email:', normalizedEmail);
        return jsonResponse({ 
          success: true, 
          user: {
            user_id: profile.user_id,
            email: profile.email,
            display_name: profile.display_name,
            leader_id: profile.neverai_id // For backward compatibility
          }
        });
      }

      // ACTION: set_upline_by_email (NEW - set upline relationship using email)
      case 'set_upline_by_email': {
        const { user_email, upline_email } = requestBody;
        
        if (!user_email || !upline_email) {
          return jsonResponse({ success: false, error: 'user_email and upline_email required' }, 400);
        }

        const normalizedUserEmail = user_email.toLowerCase().trim();
        const normalizedUplineEmail = upline_email.toLowerCase().trim();

        // Get user's profile
        const { data: userProfile } = await supabase
          .from('profiles')
          .select('user_id')
          .eq('email', normalizedUserEmail)
          .maybeSingle();

        if (!userProfile) {
          return jsonResponse({ success: false, error: 'User not found' }, 404);
        }

        // Call the RPC to update upline
        const { data, error } = await supabase.rpc('update_upline_by_email', {
          p_user_id: userProfile.user_id,
          p_upline_email: normalizedUplineEmail
        });

        if (error) {
          console.error('Update error:', error);
          return jsonResponse({ success: false, error: error.message }, 500);
        }

        console.log('Set upline for', normalizedUserEmail, 'to', normalizedUplineEmail);
        return jsonResponse(data);
      }

      // ACTION: provision_leader_id - Now just stores in pending table (no auth creation)
      case 'provision_leader_id': {
        const { email, display_name } = requestBody;
        
        if (!email) {
          return jsonResponse({ success: false, error: 'email required' }, 400);
        }

        const normalizedEmail = email.toLowerCase().trim();

        // Check if user already has a NeverAI account
        const { data: existing } = await supabase
          .from('profiles')
          .select('neverai_id')
          .eq('email', normalizedEmail)
          .maybeSingle();

        if (existing?.neverai_id) {
          console.log('Existing leader_id for', normalizedEmail, ':', existing.neverai_id);
          return jsonResponse({ 
            success: true, 
            leader_id: existing.neverai_id, 
            is_new: false 
          });
        }

        // Check if already in pending table
        const { data: pendingRecord } = await supabase
          .from('achievers_club_pending')
          .select('leader_id')
          .eq('email', normalizedEmail)
          .maybeSingle();

        if (pendingRecord?.leader_id) {
          console.log('Already pending for', normalizedEmail, ':', pendingRecord.leader_id);
          return jsonResponse({ 
            success: true, 
            leader_id: pendingRecord.leader_id, 
            is_new: false 
          });
        }

        // Generate new sequential neverai_id
        const { data: newId, error: genError } = await supabase.rpc('generate_sequential_neverai_id');
        
        if (genError || !newId) {
          console.error('ID generation failed:', genError);
          return jsonResponse({ success: false, error: 'Failed to generate ID' }, 500);
        }

        // Store in pending table instead of creating auth user
        const { error: insertError } = await supabase
          .from('achievers_club_pending')
          .insert({
            email: normalizedEmail,
            leader_id: newId,
            display_name: display_name || null
          });

        if (insertError) {
          console.error('Insert to pending failed:', insertError);
          return jsonResponse({ success: false, error: 'Failed to store pending record' }, 500);
        }
        
        console.log('Stored pending AC member:', normalizedEmail, '->', newId);
        return jsonResponse({ success: true, leader_id: newId, is_new: true });
      }

      // ACTION: check_achievers_club_membership (NEW)
      case 'check_achievers_club_membership': {
        const { email } = requestBody;
        
        if (!email) {
          return jsonResponse({ success: false, error: 'email required' }, 400);
        }

        const normalizedEmail = email.toLowerCase().trim();
        
        const { data } = await supabase
          .from('achievers_club_pending')
          .select('leader_id, display_name')
          .eq('email', normalizedEmail)
          .is('claimed_at', null)
          .maybeSingle();

        return jsonResponse({ 
          success: true, 
          is_member: !!data,
          leader_id: data?.leader_id || null
        });
      }

      // ACTION: get_subscription (check subscription status for TrackUp)
      case 'get_subscription': {
        const { email } = requestBody;
        
        if (!email) {
          return jsonResponse({ success: false, error: 'email required' }, 400);
        }

        const normalizedEmail = email.toLowerCase().trim();

        // Get user_id from profiles
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('user_id')
          .eq('email', normalizedEmail)
          .maybeSingle();

        if (profileError) {
          console.error('Profile lookup error:', profileError);
          return jsonResponse({ success: false, error: profileError.message }, 500);
        }

        if (!profile) {
          console.log('No profile found for email:', normalizedEmail);
          return jsonResponse({ 
            success: true, 
            subscription: {
              plan: 'free',
              status: 'active',
              expires_at: null,
              is_admin_override: false,
              isPro: false,
              isMini: false
            }
          });
        }

        // Fetch subscription
        const { data: subscription, error: subError } = await supabase
          .from('user_subscriptions')
          .select('*')
          .eq('user_id', profile.user_id)
          .maybeSingle();

        if (subError) {
          console.error('Subscription lookup error:', subError);
          return jsonResponse({ success: false, error: subError.message }, 500);
        }

        // Default to free if no subscription record
        if (!subscription) {
          console.log('No subscription found for user:', profile.user_id);
          return jsonResponse({ 
            success: true, 
            subscription: {
              plan: 'free',
              status: 'active',
              expires_at: null,
              is_admin_override: false,
              isPro: false,
              isMini: false
            }
          });
        }

        // Check if subscription is expired
        let effectivePlan = subscription.plan;
        if (subscription.expires_at && new Date(subscription.expires_at) <= new Date()) {
          effectivePlan = 'free';
        }

        console.log('Subscription found for', normalizedEmail, ':', effectivePlan, 'expires:', subscription.expires_at);
        
        return jsonResponse({ 
          success: true, 
          subscription: {
            plan: effectivePlan,
            status: subscription.status,
            expires_at: subscription.expires_at,
            is_admin_override: subscription.is_admin_override,
            isPro: effectivePlan === 'pro',
            isMini: effectivePlan === 'mini'
          }
        });
      }

      default:
        return jsonResponse({ 
          success: false, 
          error: 'Invalid action. Use: get_leader_ids, get_user_by_email, set_upline_by_email, provision_leader_id, get_subscription' 
        }, 400);
    }

  } catch (error) {
    console.error('cross-app-auth error:', error);
    return jsonResponse({ success: false, error: 'Internal server error' }, 500);
  }
});
