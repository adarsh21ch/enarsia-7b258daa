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
      // ACTION: get_leader_ids (batch lookup - READ ONLY)
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

      // ACTION: provision_leader_id (idempotent create)
      case 'provision_leader_id': {
        const { email, display_name } = requestBody;
        
        if (!email) {
          return jsonResponse({ success: false, error: 'email required' }, 400);
        }

        const normalizedEmail = email.toLowerCase().trim();

        // Check if exists
        const { data: existing } = await supabase
          .from('profiles')
          .select('neverai_id, user_id, display_name')
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

        // Generate new sequential neverai_id (uses the same sequence as handle_new_user trigger)
        const { data: newId, error: genError } = await supabase.rpc('generate_sequential_neverai_id');
        
        if (genError || !newId) {
          console.error('ID generation failed:', genError);
          return jsonResponse({ success: false, error: 'Failed to generate ID' }, 500);
        }

        if (existing) {
          // Profile exists but no neverai_id - update it
          const { error: updateError } = await supabase
            .from('profiles')
            .update({ 
              neverai_id: newId,
              display_name: display_name || existing.display_name,
              source_app: 'achievers_club'
            })
            .eq('user_id', existing.user_id);

          if (updateError) {
            console.error('Update failed:', updateError);
            return jsonResponse({ success: false, error: 'Update failed' }, 500);
          }
          
          console.log('Updated existing profile with leader_id:', normalizedEmail, '->', newId);
        } else {
          // No profile - create auth user (trigger will create profile)
          const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
            email: normalizedEmail,
            password: crypto.randomUUID(),
            email_confirm: true,
            user_metadata: { display_name, provisioned_by: 'achievers_club' }
          });

          if (createError) {
            console.error('User creation failed:', createError);
            return jsonResponse({ success: false, error: createError.message }, 500);
          }

          // Wait for trigger to create profile, then update it
          await new Promise(r => setTimeout(r, 100));
          
          const { error: profileUpdateError } = await supabase
            .from('profiles')
            .update({ 
              email: normalizedEmail,
              neverai_id: newId,
              display_name,
              source_app: 'achievers_club'
            })
            .eq('user_id', newUser.user!.id);

          if (profileUpdateError) {
            console.error('Profile update after creation failed:', profileUpdateError);
          }
          
          console.log('Created new user with leader_id:', normalizedEmail, '->', newId);
        }

        return jsonResponse({ success: true, leader_id: newId, is_new: true });
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
          error: 'Invalid action. Use: get_leader_ids, provision_leader_id, get_subscription' 
        }, 400);
    }

  } catch (error) {
    console.error('cross-app-auth error:', error);
    return jsonResponse({ success: false, error: 'Internal server error' }, 500);
  }
});
