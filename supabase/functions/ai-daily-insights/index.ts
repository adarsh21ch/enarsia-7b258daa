import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const AI_GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-2.5-flash-lite";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Cron-secret guard — this endpoint is invoked only by the scheduled cron job.
  const cronSecret = Deno.env.get('CRON_SECRET');
  const authHeader = req.headers.get('Authorization') || req.headers.get('authorization');
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    if (!LOVABLE_API_KEY) {
      return json({ error: "AI service not configured" }, 500);
    }

    // Current IST hour
    const nowUTC = new Date();
    const istHour = (nowUTC.getUTCHours() + 5 + Math.floor((nowUTC.getUTCMinutes() + 30) / 60)) % 24;
    const todayStr = nowUTC.toISOString().split("T")[0];

    console.log(`ai-daily-insights running at IST hour ${istHour}`);

    // 1. Process AI Tracker Configs due now
    const { data: dueTrackers, error: trackerErr } = await supabase
      .from("ai_tracker_configs")
      .select("*")
      .eq("is_active", true)
      .eq("notify_hour", istHour);

    if (trackerErr) {
      console.error("Error fetching trackers:", trackerErr);
    }

    // 2. Process daily snapshot preferences due now
    const { data: duePrefs, error: prefsErr } = await supabase
      .from("ai_insight_preferences")
      .select("*")
      .eq("daily_snapshot", true)
      .eq("snapshot_hour", istHour);

    if (prefsErr) {
      console.error("Error fetching prefs:", prefsErr);
    }

    // Collect unique user IDs that need processing
    const userIds = new Set<string>();
    const userTrackers = new Map<string, any[]>();
    const userWantsSnapshot = new Set<string>();

    for (const t of (dueTrackers || [])) {
      // Check if already sent today (for daily frequency)
      if (t.frequency === "daily" && t.last_sent_at) {
        const lastSent = t.last_sent_at.split("T")[0];
        if (lastSent === todayStr) continue;
      }
      // Weekly: check if sent in last 7 days
      if (t.frequency === "weekly" && t.last_sent_at) {
        const lastSentDate = new Date(t.last_sent_at);
        const daysSince = (nowUTC.getTime() - lastSentDate.getTime()) / (1000 * 60 * 60 * 24);
        if (daysSince < 6.5) continue;
      }
      // Monthly: check if sent in last 28 days
      if (t.frequency === "monthly" && t.last_sent_at) {
        const lastSentDate = new Date(t.last_sent_at);
        const daysSince = (nowUTC.getTime() - lastSentDate.getTime()) / (1000 * 60 * 60 * 24);
        if (daysSince < 27) continue;
      }

      userIds.add(t.user_id);
      if (!userTrackers.has(t.user_id)) userTrackers.set(t.user_id, []);
      userTrackers.get(t.user_id)!.push(t);
    }

    for (const p of (duePrefs || [])) {
      userIds.add(p.user_id);
      userWantsSnapshot.add(p.user_id);
    }

    if (userIds.size === 0) {
      return json({ processed: 0, message: "No due notifications" });
    }

    console.log(`Processing ${userIds.size} users`);

    let sentCount = 0;

    for (const userId of userIds) {
      try {
        // Fetch today's snapshot data for this user
        const { data: todaySnap } = await supabase
          .from("total_snapshot_v2")
          .select("total_leads, total_responses, final_tag_count, funnel_day")
          .eq("user_id", userId)
          .eq("date", todayStr)
          .maybeSingle();

        const leads = todaySnap?.total_leads || 0;
        const responses = todaySnap?.total_responses || 0;
        const enrollments = todaySnap?.final_tag_count || 0;

        // Build notification content
        const trackerList = userTrackers.get(userId) || [];
        const wantsSnapshot = userWantsSnapshot.has(userId);

        let notificationTitle = "";
        let notificationBody = "";

        if (wantsSnapshot) {
          notificationTitle = "📊 Daily Business Snapshot";
          notificationBody = `Leads: ${leads} | Responses: ${responses} | Enrollments: ${enrollments}`;
          if (todaySnap?.funnel_day) {
            notificationBody += ` | Funnel Day: ${todaySnap.funnel_day}`;
          }
        } else if (trackerList.length > 0) {
          // Build tracker-specific notification
          const metricLabels: Record<string, string> = {
            leads_added: "Leads Added",
            calls_made: "Calls Made",
            videos_sent: "Videos Sent",
            follow_ups: "Follow-ups",
            positive_prospects: "Positive Prospects",
            funnel_stages: "Funnel Stages",
            team_updates: "Team Updates",
            team_level_counts: "Team Levels",
          };

          notificationTitle = "📈 AI Tracker Update";
          const parts: string[] = [];
          for (const t of trackerList) {
            const label = metricLabels[t.metric_type] || t.metric_type;
            if (t.metric_type === "leads_added") parts.push(`${label}: ${leads}`);
            else if (t.metric_type === "follow_ups") parts.push(`${label}: ${responses}`);
            else parts.push(`${label}: Check app`);
          }
          notificationBody = parts.join(" | ");
        }

        if (!notificationTitle) continue;

        // Send push notification
        const { data: subs } = await supabase
          .from("push_subscriptions")
          .select("id, endpoint, p256dh, auth_key")
          .eq("user_id", userId);

        if (subs && subs.length > 0) {
          // Call the send-push-notification function internally
          // We'll send directly using the same web-push approach
          const pushUrl = `${supabaseUrl}/functions/v1/send-push-notification`;
          await fetch(pushUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${serviceRoleKey}`,
            },
            body: JSON.stringify({
              action: "send-to-user",
              user_id: userId,
              title: notificationTitle,
              body: notificationBody,
              url: "/tracking",
            }),
          }).catch(e => console.error(`Push send failed for ${userId}:`, e));

          sentCount++;
        }

        // Store in-app notification via inbox_messages if table exists
        await supabase.from("inbox_messages").insert({
          user_id: userId,
          sender_id: userId,
          message: `**${notificationTitle}**\n${notificationBody}`,
          type: "ai_insight",
        }).then(({ error }) => {
          if (error) console.log("inbox_messages insert skipped:", error.message);
        });

        // Update last_sent_at for processed trackers
        for (const t of trackerList) {
          await supabase
            .from("ai_tracker_configs")
            .update({ last_sent_at: nowUTC.toISOString() })
            .eq("id", t.id);
        }
      } catch (userErr) {
        console.error(`Error processing user ${userId}:`, userErr);
      }
    }

    return json({ processed: userIds.size, sent: sentCount });
  } catch (error: any) {
    console.error("ai-daily-insights error:", error);
    return json({ error: error?.message || "Unknown error" }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
