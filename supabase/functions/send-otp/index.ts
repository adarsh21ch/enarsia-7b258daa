import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

const jsonResponse = (data: object, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });

// Generate a 4-digit OTP
function generateOTP(): string {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return (1000 + (array[0] % 9000)).toString();
}

// Validate email format
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email } = await req.json();

    // Validate email
    if (!email || !isValidEmail(email)) {
      return jsonResponse({ success: false, error: 'Please enter a valid email address' }, 400);
    }

    const normalizedEmail = email.toLowerCase().trim();

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Rate limiting: Check how many OTPs sent to this email in last 10 minutes
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { data: recentOtps, error: countError } = await supabase
      .from('email_otps')
      .select('id')
      .eq('email', normalizedEmail)
      .gte('created_at', tenMinutesAgo);

    if (countError) {
      console.error('Error checking rate limit:', countError);
      return jsonResponse({ success: false, error: 'Failed to process request' }, 500);
    }

    if (recentOtps && recentOtps.length >= 3) {
      return jsonResponse({ 
        success: false, 
        error: 'Too many verification codes requested. Please wait 10 minutes before trying again.' 
      }, 429);
    }

    // ============================================
    // PRODUCT-SCOPED AUTH: Check if user has Nevorai access
    // Instead of checking if user exists in auth.users,
    // we check if user has 'nevorai' product access
    // ============================================
    
    // First, get user_id from profiles by email
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (existingProfile?.user_id) {
      // User exists - check if they have Nevorai product access
      const { data: hasNevorai } = await supabase
        .from('user_products')
        .select('id')
        .eq('user_id', existingProfile.user_id)
        .eq('product', 'nevorai')
        .maybeSingle();

      if (hasNevorai) {
        // User already has Nevorai access - they should log in instead
        return jsonResponse({ 
          success: false, 
          error: 'You already have a Nevorai account. Please sign in instead.' 
        }, 400);
      }
      
      // User exists but doesn't have Nevorai access (e.g., Achievers Club user)
      // Allow them to continue with signup to get Nevorai access
      console.log('Existing user without Nevorai access, allowing signup:', normalizedEmail);
    }

    // Generate OTP
    const otpCode = generateOTP();

    // Store OTP in database
    const { error: insertError } = await supabase
      .from('email_otps')
      .insert({
        email: normalizedEmail,
        otp_code: otpCode,
        expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 minutes
      });

    if (insertError) {
      console.error('Error storing OTP:', insertError);
      return jsonResponse({ success: false, error: 'Failed to generate verification code' }, 500);
    }

    // Send email via Resend
    const { error: emailError } = await resend.emails.send({
      from: 'NevorAI <noreply@nevorai.com>',
      to: [normalizedEmail],
      subject: 'Your Enarsia Verification Code',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f5;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f5; padding: 40px 20px;">
            <tr>
              <td align="center">
                <table width="100%" style="max-width: 400px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
                  <tr>
                    <td style="padding: 40px 32px; text-align: center;">
                      <h1 style="color: #18181b; font-size: 24px; font-weight: 700; margin: 0 0 8px 0;">Enarsia</h1>
                      <p style="color: #71717a; font-size: 14px; margin: 0 0 32px 0;">Verify your email address</p>
                      
                      <p style="color: #3f3f46; font-size: 15px; margin: 0 0 24px 0;">Enter this code to complete your signup:</p>
                      
                      <div style="background-color: #f4f4f5; border-radius: 8px; padding: 20px; margin: 0 0 24px 0;">
                        <span style="font-family: 'SF Mono', Monaco, 'Courier New', monospace; font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #18181b;">${otpCode}</span>
                      </div>
                      
                      <p style="color: #a1a1aa; font-size: 13px; margin: 0;">This code expires in 10 minutes.</p>
                      <p style="color: #a1a1aa; font-size: 13px; margin: 8px 0 0 0;">If you didn't request this, please ignore this email.</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
    });

    if (emailError) {
      console.error('Error sending email:', emailError);
      return jsonResponse({ success: false, error: 'Failed to send verification email. Please try again.' }, 500);
    }

    console.log('OTP sent successfully to:', normalizedEmail);
    return jsonResponse({ success: true, message: 'Verification code sent!' });

  } catch (error) {
    console.error('send-otp error:', error);
    return jsonResponse({ success: false, error: 'An unexpected error occurred' }, 500);
  }
});
