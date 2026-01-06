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
          .select('email, leader_id')
          .in('email', normalizedEmails);

        if (error) {
          console.error('Query error:', error);
          return jsonResponse({ success: false, error: error.message }, 500);
        }

        const leader_ids = (data || []).map(p => ({
          email: p.email,
          leader_id: p.leader_id
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

        // Check if exists - use leader_id as canonical field
        const { data: existing } = await supabase
          .from('profiles')
          .select('leader_id, user_id, display_name')
          .eq('email', normalizedEmail)
          .maybeSingle();

        if (existing?.leader_id) {
          console.log('Existing leader_id for', normalizedEmail, ':', existing.leader_id);
          return jsonResponse({ 
            success: true, 
            leader_id: existing.leader_id, 
            is_new: false 
          });
        }

        // Generate new leader_id using canonical function
        const { data: newId, error: genError } = await supabase.rpc('generate_leader_id');
        
        if (genError || !newId) {
          console.error('ID generation failed:', genError);
          return jsonResponse({ success: false, error: 'Failed to generate ID' }, 500);
        }

        if (existing) {
          // Profile exists but no leader_id - update it
          const { error: updateError } = await supabase
            .from('profiles')
            .update({ 
              leader_id: newId,
              neverai_id: newId, // Keep deprecated column in sync
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
          // No profile - create auth user (trigger will create profile with leader_id)
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

          // Wait for trigger to create profile, then update with additional fields
          await new Promise(r => setTimeout(r, 100));
          
          const { error: profileUpdateError } = await supabase
            .from('profiles')
            .update({ 
              email: normalizedEmail,
              display_name,
              source_app: 'achievers_club'
            })
            .eq('user_id', newUser.user!.id);

          if (profileUpdateError) {
            console.error('Profile update after creation failed:', profileUpdateError);
          }

          // Get the generated leader_id from the trigger
          const { data: createdProfile } = await supabase
            .from('profiles')
            .select('leader_id')
            .eq('user_id', newUser.user!.id)
            .single();
          
          console.log('Created new user with leader_id:', normalizedEmail, '->', createdProfile?.leader_id);
          return jsonResponse({ success: true, leader_id: createdProfile?.leader_id || newId, is_new: true });
        }

        return jsonResponse({ success: true, leader_id: newId, is_new: true });
      }

      default:
        return jsonResponse({ 
          success: false, 
          error: 'Invalid action. Use: get_leader_ids, provision_leader_id' 
        }, 400);
    }

  } catch (error) {
    console.error('cross-app-auth error:', error);
    return jsonResponse({ success: false, error: 'Internal server error' }, 500);
  }
});
