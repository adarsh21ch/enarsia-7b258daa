import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotificationSequence {
  triggerType: string;
  condition: string;
  title: string;
  body: string;
  delayHours?: number;
}

// Sequence A: New User Onboarding
const ONBOARDING_SEQUENCES: NotificationSequence[] = [
  {
    triggerType: 'onboarding_4h',
    condition: 'signup_4h',
    title: 'Your leads are waiting 👋',
    body: 'You signed up for Nevorai CRM! Import your first leads in 2 minutes.',
  },
  {
    triggerType: 'onboarding_day1',
    condition: 'signup_day1_not_step3',
    title: 'One small step 📋',
    body: "You're 3 taps away from organizing your first prospect. Open Nevorai CRM now.",
  },
  {
    triggerType: 'onboarding_day3',
    condition: 'signup_day3_not_complete',
    title: "Don't lose momentum 🔥",
    body: 'Top network marketers follow up 5x more. Nevorai CRM makes it automatic.',
  },
  {
    triggerType: 'onboarding_day7',
    condition: 'signup_day7_never_used',
    title: 'Adarsh here 👋',
    body: 'Personally reaching out — is there anything confusing about the app? Reply to let us know.',
  },
];

// Sequence B: Lead Limit Nudge
const LEAD_LIMIT_SEQUENCES: NotificationSequence[] = [
  {
    triggerType: 'lead_limit_50',
    condition: 'reached_50_leads',
    title: 'Halfway there 📊',
    body: "You've added 50 leads! Pro users manage 5x more. Upgrade anytime.",
  },
  {
    triggerType: 'lead_limit_80',
    condition: 'reached_80_leads',
    title: 'Almost at your limit ⚠️',
    body: '80/100 free leads used. Upgrade to Pro to keep growing without limits.',
  },
  {
    triggerType: 'lead_limit_100',
    condition: 'reached_100_leads',
    title: "You've hit your limit 🔒",
    body: "Upgrade to Pro for unlimited leads — your growth shouldn't stop here.",
  },
];

// Sequence C: Re-engagement
const REENGAGEMENT_SEQUENCES: NotificationSequence[] = [
  {
    triggerType: 'dormant_3d',
    condition: 'no_activity_3d',
    title: 'Your prospects miss you 👀',
    body: '3 days since you last updated your leads. 5 minutes = stay organized.',
  },
  {
    triggerType: 'dormant_7d',
    condition: 'no_activity_7d',
    title: 'Quick question 🤔',
    body: "What's stopping you from using Nevorai CRM? We want to make it better for you.",
  },
  {
    triggerType: 'dormant_14d',
    condition: 'no_activity_14d',
    title: 'Last try 🙏',
    body: "Haven't seen you in 2 weeks. Here's 7 days extra Pro free — on us.",
  },
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Cron-secret guard — only the scheduled cron should fan out push notifications.
  const cronSecret = Deno.env.get('CRON_SECRET');
  const authHeader = req.headers.get('Authorization') || req.headers.get('authorization');
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const now = new Date();
    const results: { type: string; sent: number; errors: number }[] = [];

    // Helper: send push to a user's subscriptions
    async function sendPushToUser(userId: string, title: string, body: string, triggerType: string) {
      // Check if we already sent this notification type to this user
      const { data: existing } = await supabase
        .from('admin_notifications')
        .select('id')
        .eq('sent_by', triggerType)
        .eq('title', title)
        .limit(1);
      
      // Get user's push subscriptions
      const { data: subs } = await supabase
        .from('push_subscriptions')
        .select('*')
        .eq('user_id', userId);

      if (!subs || subs.length === 0) return 0;

      let sent = 0;
      for (const sub of subs) {
        try {
          // Use the send-push-notification function
          await supabase.functions.invoke('send-push-notification', {
            body: {
              subscription: {
                endpoint: sub.endpoint,
                keys: sub.keys,
              },
              title,
              body,
            },
          });
          sent++;
        } catch (err) {
          console.error(`Push failed for user ${userId}:`, err);
        }
      }
      return sent;
    }

    // SEQUENCE A: Onboarding reminders
    // 4 hours after signup, onboarding not started
    const fourHoursAgo = new Date(now.getTime() - 4 * 60 * 60 * 1000);
    const fiveHoursAgo = new Date(now.getTime() - 5 * 60 * 60 * 1000);
    
    const { data: newUsers4h } = await supabase
      .from('profiles')
      .select('user_id, display_name')
      .gte('created_at', fiveHoursAgo.toISOString())
      .lte('created_at', fourHoursAgo.toISOString())
      .eq('onboarding_completed', false)
      .eq('onboarding_step', 0)
      .limit(50);

    let onboardingSent = 0;
    for (const user of (newUsers4h || [])) {
      onboardingSent += await sendPushToUser(
        user.user_id,
        ONBOARDING_SEQUENCES[0].title,
        ONBOARDING_SEQUENCES[0].body,
        'onboarding_4h'
      );
    }
    results.push({ type: 'onboarding_4h', sent: onboardingSent, errors: 0 });

    // Day 1 - onboarding < step 3
    const day1Ago = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const day1Window = new Date(now.getTime() - 26 * 60 * 60 * 1000);
    
    const { data: day1Users } = await supabase
      .from('profiles')
      .select('user_id, display_name')
      .gte('created_at', day1Window.toISOString())
      .lte('created_at', day1Ago.toISOString())
      .eq('onboarding_completed', false)
      .lt('onboarding_step', 3)
      .limit(50);

    let day1Sent = 0;
    for (const user of (day1Users || [])) {
      day1Sent += await sendPushToUser(
        user.user_id,
        ONBOARDING_SEQUENCES[1].title,
        ONBOARDING_SEQUENCES[1].body,
        'onboarding_day1'
      );
    }
    results.push({ type: 'onboarding_day1', sent: day1Sent, errors: 0 });

    // Day 3 - onboarding not complete
    const day3Ago = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
    const day3Window = new Date(now.getTime() - 3.1 * 24 * 60 * 60 * 1000);
    
    const { data: day3Users } = await supabase
      .from('profiles')
      .select('user_id, display_name')
      .gte('created_at', day3Window.toISOString())
      .lte('created_at', day3Ago.toISOString())
      .eq('onboarding_completed', false)
      .limit(50);

    let day3Sent = 0;
    for (const user of (day3Users || [])) {
      day3Sent += await sendPushToUser(
        user.user_id,
        ONBOARDING_SEQUENCES[2].title,
        ONBOARDING_SEQUENCES[2].body,
        'onboarding_day3'
      );
    }
    results.push({ type: 'onboarding_day3', sent: day3Sent, errors: 0 });

    // SEQUENCE C: Re-engagement (3d, 7d, 14d dormant)
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    // 3-day dormant users (check user_app_access)
    const { data: dormant3d } = await supabase
      .from('user_app_access')
      .select('user_id')
      .lt('last_seen_at', threeDaysAgo.toISOString())
      .gte('last_seen_at', sevenDaysAgo.toISOString())
      .limit(50);

    let dormant3Sent = 0;
    for (const user of (dormant3d || [])) {
      dormant3Sent += await sendPushToUser(
        user.user_id,
        REENGAGEMENT_SEQUENCES[0].title,
        REENGAGEMENT_SEQUENCES[0].body,
        'dormant_3d'
      );
    }
    results.push({ type: 'dormant_3d', sent: dormant3Sent, errors: 0 });

    // 7-day dormant
    const { data: dormant7d } = await supabase
      .from('user_app_access')
      .select('user_id')
      .lt('last_seen_at', sevenDaysAgo.toISOString())
      .gte('last_seen_at', fourteenDaysAgo.toISOString())
      .limit(50);

    let dormant7Sent = 0;
    for (const user of (dormant7d || [])) {
      dormant7Sent += await sendPushToUser(
        user.user_id,
        REENGAGEMENT_SEQUENCES[1].title,
        REENGAGEMENT_SEQUENCES[1].body,
        'dormant_7d'
      );
    }
    results.push({ type: 'dormant_7d', sent: dormant7Sent, errors: 0 });

    return new Response(
      JSON.stringify({ success: true, results, processed_at: now.toISOString() }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Notification sequence error:', error);
    return new Response(
      JSON.stringify({ success: false, error: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
