import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      throw new Error('RESEND_API_KEY not configured');
    }

    const resend = new Resend(resendApiKey);
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const tomorrowStart = new Date(tomorrow);
    tomorrowStart.setHours(0, 0, 0, 0);
    const tomorrowEnd = new Date(tomorrow);
    tomorrowEnd.setHours(23, 59, 59, 999);

    console.log('Checking for subscriptions expiring tomorrow...');
    console.log('Tomorrow range:', tomorrowStart.toISOString(), '-', tomorrowEnd.toISOString());

    // Find subscriptions expiring tomorrow
    const { data: expiringSubs, error: expiringError } = await supabase
      .from('user_subscriptions')
      .select('id, user_id, expires_at')
      .eq('plan', 'pro')
      .eq('status', 'active')
      .gte('expires_at', tomorrowStart.toISOString())
      .lte('expires_at', tomorrowEnd.toISOString());

    if (expiringError) {
      console.error('Error fetching expiring subscriptions:', expiringError);
      throw expiringError;
    }

    console.log(`Found ${expiringSubs?.length || 0} subscriptions expiring tomorrow`);

    let emailsSent = 0;
    let emailsFailed = 0;

    if (expiringSubs && expiringSubs.length > 0) {
      for (const sub of expiringSubs) {
        // Get user email from auth.users
        const { data: userData, error: userError } = await supabase.auth.admin.getUserById(sub.user_id);
        
        if (userError || !userData?.user?.email) {
          console.error(`Could not get email for user ${sub.user_id}:`, userError);
          emailsFailed++;
          continue;
        }

        const userEmail = userData.user.email;
        const expiryDate = new Date(sub.expires_at).toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        });

        try {
          const { error: emailError } = await resend.emails.send({
            from: 'NevorAI <onboarding@resend.dev>',
            to: [userEmail],
            subject: '⏰ Your NevorAI Pro expires tomorrow!',
            html: `
              <!DOCTYPE html>
              <html>
              <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
              </head>
              <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f4f4f5; margin: 0; padding: 20px;">
                <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                  <div style="background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%); padding: 32px; text-align: center;">
                    <h1 style="color: #ffffff; margin: 0; font-size: 28px;">NevorAI</h1>
                    <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0; font-size: 14px;">Never miss a followup again</p>
                  </div>
                  
                  <div style="padding: 32px;">
                    <h2 style="color: #18181b; margin: 0 0 16px 0; font-size: 24px;">Your Pro access expires tomorrow!</h2>
                    
                    <p style="color: #52525b; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
                      Hi there! 👋
                    </p>
                    
                    <p style="color: #52525b; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
                      This is a friendly reminder that your <strong>NevorAI Pro</strong> subscription will expire on <strong>${expiryDate}</strong>.
                    </p>
                    
                    <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; border-radius: 0 8px 8px 0; margin: 0 0 24px 0;">
                      <p style="color: #92400e; font-size: 14px; margin: 0;">
                        ⚠️ After expiry, you'll lose access to TrackUp, ActionUp, and other Pro features.
                      </p>
                    </div>
                    
                    <p style="color: #52525b; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
                      To continue enjoying unlimited access to all Pro features, renew your subscription today!
                    </p>
                    
                    <div style="text-align: center; margin: 32px 0;">
                      <a href="https://nevorai.lovable.app/profile" style="display: inline-block; background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%); color: #ffffff; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                        Renew Pro – Starting ₹249/month
                      </a>
                    </div>
                    
                    <p style="color: #71717a; font-size: 14px; line-height: 1.6; margin: 24px 0 0 0;">
                      Thank you for being a Pro member! 💜
                    </p>
                  </div>
                  
                  <div style="background-color: #f4f4f5; padding: 24px; text-align: center;">
                    <p style="color: #71717a; font-size: 12px; margin: 0;">
                      © 2024 NevorAI. All rights reserved.<br>
                      <a href="mailto:teamnevorai@gmail.com" style="color: #8b5cf6; text-decoration: none;">teamnevorai@gmail.com</a>
                    </p>
                  </div>
                </div>
              </body>
              </html>
            `,
          });

          if (emailError) {
            console.error(`Failed to send email to ${userEmail}:`, emailError);
            emailsFailed++;
          } else {
            console.log(`Expiry reminder sent to ${userEmail}`);
            emailsSent++;
          }
        } catch (sendError) {
          console.error(`Error sending email to ${userEmail}:`, sendError);
          emailsFailed++;
        }
      }
    }

    const result = {
      success: true,
      timestamp: now.toISOString(),
      expiring_tomorrow: expiringSubs?.length || 0,
      emails_sent: emailsSent,
      emails_failed: emailsFailed,
    };

    console.log('Expiry reminder check completed:', result);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });

  } catch (error: any) {
    console.error('Error in send-expiry-reminder:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }
});
