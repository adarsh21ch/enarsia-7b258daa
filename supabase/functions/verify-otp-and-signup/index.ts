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

    // Check if user already exists (edge case: signed up between OTP send and verify)
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(u => u.email?.toLowerCase() === normalizedEmail);
    
    if (existingUser) {
      return jsonResponse({ 
        success: false, 
        error: 'An account with this email already exists. Please sign in instead.' 
      }, 400);
    }

    // Create the user account
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

    const newUserId = newUserData.user?.id;
    console.log('User created successfully:', newUserId);

    // Wait a moment for profile trigger to fire
    await new Promise(resolve => setTimeout(resolve, 200));

    // Update profile with display_name
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ 
        display_name: name.trim(),
        email: normalizedEmail
      })
      .eq('user_id', newUserId);

    if (profileError) {
      console.error('Error updating profile:', profileError);
      // Non-fatal, continue
    }

    // Check if this user is an Achievers Club member (from pending table)
    let isAchieversClubMember = false;
    let linkedLeaderId: string | null = null;

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
          claimed_user_id: newUserId
        })
        .eq('id', pendingAC.id);

      // Update profile with leader_id and source info
      await supabase
        .from('profiles')
        .update({ 
          neverai_id: linkedLeaderId,
          source_app: 'achievers_club_linked'
        })
        .eq('user_id', newUserId);
    }

    // Clean up old OTPs for this email
    await supabase
      .from('email_otps')
      .delete()
      .eq('email', normalizedEmail);

    return jsonResponse({ 
      success: true, 
      message: 'Account created successfully!',
      is_achievers_club_member: isAchieversClubMember,
      leader_id: linkedLeaderId
    });

  } catch (error) {
    console.error('verify-otp-and-signup error:', error);
    return jsonResponse({ success: false, error: 'An unexpected error occurred' }, 500);
  }
});
