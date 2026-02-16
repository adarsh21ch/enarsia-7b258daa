import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
    const { email, otp_code, password, name } = await req.json();

    // Validate inputs
    if (!email || !otp_code || !password || !name) {
      return jsonResponse({ success: false, error: 'All fields are required' }, 400);
    }

    if (otp_code.length !== 4 || !/^\d{4}$/.test(otp_code)) {
      return jsonResponse({ success: false, error: 'Invalid verification code format' }, 400);
    }

    if (password.length < 6) {
      return jsonResponse({ success: false, error: 'Password must be at least 6 characters' }, 400);
    }

    const normalizedEmail = email.toLowerCase().trim();

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Find the latest valid OTP for this email
    const { data: otpRecord, error: otpError } = await supabase
      .from('email_otps')
      .select('*')
      .eq('email', normalizedEmail)
      .eq('verified', false)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (otpError) {
      console.error('Error fetching OTP:', otpError);
      return jsonResponse({ success: false, error: 'Failed to verify code' }, 500);
    }

    if (!otpRecord) {
      return jsonResponse({ success: false, error: 'No valid verification code found. Please request a new one.' }, 400);
    }

    // Check brute force protection (max 5 attempts)
    if (otpRecord.attempts >= 5) {
      return jsonResponse({ 
        success: false, 
        error: 'Too many failed attempts. Please request a new verification code.' 
      }, 429);
    }

    // Verify OTP code
    if (otpRecord.otp_code !== otp_code) {
      // Increment attempt counter
      await supabase
        .from('email_otps')
        .update({ attempts: otpRecord.attempts + 1 })
        .eq('id', otpRecord.id);

      const remainingAttempts = 5 - (otpRecord.attempts + 1);
      return jsonResponse({ 
        success: false, 
        error: `Invalid verification code. ${remainingAttempts} attempt${remainingAttempts !== 1 ? 's' : ''} remaining.`
      }, 400);
    }

    // OTP is valid - mark as verified
    await supabase
      .from('email_otps')
      .update({ verified: true })
      .eq('id', otpRecord.id);

    // ============================================
    // PRODUCT-SCOPED AUTH: Handle existing users
    // ============================================
    
    // Check if user already exists in auth
    // Look up existing user via profiles table (has email), then get auth user by ID
    let existingUser = null;
    const { data: profileMatch } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('email', normalizedEmail)
      .maybeSingle();
    
    if (profileMatch) {
      const { data: userData } = await supabase.auth.admin.getUserById(profileMatch.user_id);
      existingUser = userData?.user ?? null;
    }
    
    let userId: string;
    let isExistingUser = false;
    let isAchieversClubMember = false;
    let linkedLeaderId: string | null = null;

    if (existingUser) {
      // User exists in auth.users - check if they have Nevorai access
      const { data: hasNevorai } = await supabase
        .from('user_products')
        .select('id')
        .eq('user_id', existingUser.id)
        .eq('product', 'nevorai')
        .maybeSingle();

      if (hasNevorai) {
        // Already has Nevorai - tell them to sign in
        return jsonResponse({ 
          success: false, 
          error: 'You already have a Nevorai account. Please sign in instead.' 
        }, 400);
      }

      // User exists but doesn't have Nevorai access (e.g., Achievers Club user)
      // Grant them Nevorai access instead of creating new account
      console.log('Granting Nevorai access to existing user:', normalizedEmail);
      
      userId = existingUser.id;
      isExistingUser = true;

      // Update their password (they're creating their Nevorai account)
      const { error: updateError } = await supabase.auth.admin.updateUserById(existingUser.id, { 
        password: password,
        user_metadata: {
          ...existingUser.user_metadata,
          display_name: name.trim(),
          full_name: name.trim()
        }
      });

      if (updateError) {
        console.error('Error updating user password:', updateError);
        return jsonResponse({ success: false, error: 'Failed to set up account. Please try again.' }, 500);
      }

      // Grant Nevorai product access
      const { error: productError } = await supabase
        .from('user_products')
        .insert({ user_id: userId, product: 'nevorai' });

      if (productError) {
        console.error('Error granting product access:', productError);
        // Non-fatal, continue
      }

      // Update profile with display_name
      await supabase
        .from('profiles')
        .update({ 
          display_name: name.trim(),
          source_app: 'achievers_club_linked' // Mark as AC user who linked to Nevorai
        })
        .eq('user_id', userId);

      // Check if this was an Achievers Club member
      const { data: acCheck } = await supabase
        .from('user_products')
        .select('id')
        .eq('user_id', userId)
        .eq('product', 'achievers_club')
        .maybeSingle();

      if (acCheck) {
        isAchieversClubMember = true;
        // Get their leader_id
        const { data: profile } = await supabase
          .from('profiles')
          .select('neverai_id')
          .eq('user_id', userId)
          .maybeSingle();
        linkedLeaderId = profile?.neverai_id || null;
      }

    } else {
      // User doesn't exist - create new auth.user
      const { data: newUserData, error: createError } = await supabase.auth.admin.createUser({
        email: normalizedEmail,
        password: password,
        email_confirm: true, // Email is already verified via OTP
        user_metadata: { 
          display_name: name.trim(),
          full_name: name.trim()
        }
      });

      if (createError) {
        console.error('Error creating user:', createError);
        return jsonResponse({ success: false, error: 'Failed to create account. Please try again.' }, 500);
      }

      userId = newUserData.user!.id;
      console.log('User created successfully:', userId);

      // Wait a moment for profile trigger to fire
      await new Promise(resolve => setTimeout(resolve, 200));

      // Update profile with display_name
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ 
          display_name: name.trim(),
          email: normalizedEmail
        })
        .eq('user_id', userId);

      if (profileError) {
        console.error('Error updating profile:', profileError);
        // Non-fatal, continue
      }

      // Grant Nevorai product access
      const { error: productError } = await supabase
        .from('user_products')
        .insert({ user_id: userId, product: 'nevorai' });

      if (productError) {
        console.error('Error granting product access:', productError);
        // Non-fatal, continue
      }

      // Check if this user is an Achievers Club member (from pending table)
      const { data: pendingAC, error: pendingError } = await supabase
        .from('achievers_club_pending')
        .select('*')
        .eq('email', normalizedEmail)
        .is('claimed_at', null)
        .maybeSingle();

      if (!pendingError && pendingAC) {
        isAchieversClubMember = true;
        linkedLeaderId = pendingAC.leader_id;

        console.log('Linking Achievers Club membership:', normalizedEmail, linkedLeaderId);

        // Update the pending record as claimed
        await supabase
          .from('achievers_club_pending')
          .update({ 
            claimed_at: new Date().toISOString(),
            claimed_user_id: userId
          })
          .eq('id', pendingAC.id);

        // Update profile with leader_id and source info
        await supabase
          .from('profiles')
          .update({ 
            neverai_id: linkedLeaderId,
            source_app: 'achievers_club_linked'
          })
          .eq('user_id', userId);

        // Grant Achievers Club product access
        await supabase
          .from('user_products')
          .insert({ user_id: userId, product: 'achievers_club' });
      }
    }

    // Clean up old OTPs for this email
    await supabase
      .from('email_otps')
      .delete()
      .eq('email', normalizedEmail);

    const message = isExistingUser 
      ? 'Nevorai account activated!' 
      : 'Account created successfully!';

    return jsonResponse({ 
      success: true, 
      message,
      is_achievers_club_member: isAchieversClubMember,
      leader_id: linkedLeaderId,
      is_existing_user: isExistingUser
    });

  } catch (error) {
    console.error('verify-otp-and-signup error:', error);
    return jsonResponse({ success: false, error: 'An unexpected error occurred' }, 500);
  }
});
