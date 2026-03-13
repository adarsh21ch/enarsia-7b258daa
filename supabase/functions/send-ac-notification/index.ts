import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * send-ac-notification
 *
 * Sends context-aware, groupable push notifications for Achievers Club events.
 *
 * Request body:
 * {
 *   type: "announcement" | "chat" | "event" | "update",
 *   contextName: string,          // e.g. "Focus Group", "Achievers Club"
 *   contextId?: string,           // optional group/channel id
 *   senderName: string,           // display name of the person who triggered
 *   senderId: string,             // user_id of sender
 *   title: string,                // notification title (used for single)
 *   body: string,                 // notification body (used for single)
 *   url: string,                  // deep link path e.g. "/achievers-club"
 *   recipientUserIds?: string[],  // specific recipients (omit = all subscribers except sender)
 *   excludeUserIds?: string[],    // user ids to exclude
 * }
 */

type PushRow = {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth_key: string;
};

type RequestBody = {
  type?: string;
  contextName?: string;
  contextId?: string;
  senderName?: string;
  senderId?: string;
  title?: string;
  body?: string;
  url?: string;
  recipientUserIds?: string[];
  excludeUserIds?: string[];
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Auth check
    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }
    const token = authHeader.replace("Bearer ", "").trim();
    const { data: authData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !authData.user) {
      return json({ error: "Unauthorized" }, 401);
    }

    const payload: RequestBody = await req.json().catch(() => ({}));
    const {
      type = "update",
      contextName = "Achievers Club",
      contextId,
      senderName = "Someone",
      senderId,
      title,
      body,
      url = "/achievers-club",
      recipientUserIds,
      excludeUserIds = [],
    } = payload;

    if (!title || !body) {
      return json({ error: "title and body are required" }, 400);
    }

    // Get VAPID keys
    const vapidKeys = await getVapidKeys(supabase);
    webpush.setVapidDetails(
      "mailto:teamnevorai@gmail.com",
      vapidKeys.publicKey,
      vapidKeys.privateKey,
    );

    // Build the grouping tag: context-specific so notifications group properly
    const groupKey = contextId
      ? `ac-${type}-${contextId}`
      : `ac-${type}-general`;

    // Determine context type label for grouped display
    const contextTypeMap: Record<string, string> = {
      announcement: "announcements",
      chat: "messages",
      event: "events",
      update: "updates",
    };
    const contextType = contextTypeMap[type] || "updates";

    // Build push payload with grouping metadata
    const pushPayload = {
      title,
      body,
      url,
      tag: groupKey,
      groupKey,
      senderName,
      contextName,
      contextType,
    };

    // Fetch subscriptions
    let query = supabase
      .from("push_subscriptions")
      .select("id, user_id, endpoint, p256dh, auth_key");

    if (recipientUserIds && recipientUserIds.length > 0) {
      query = query.in("user_id", recipientUserIds);
    }

    const { data: subs, error: subsError } = await query;
    if (subsError) throw subsError;

    // Filter out sender and excluded users
    const actualSenderId = senderId || authData.user.id;
    const excludeSet = new Set([actualSenderId, ...excludeUserIds]);
    const filteredSubs = (subs ?? []).filter(
      (s: PushRow) => !excludeSet.has(s.user_id),
    );

    // Send notifications
    let sent = 0;
    let failed = 0;
    const staleIds: string[] = [];

    for (const sub of filteredSubs as PushRow[]) {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth_key },
          },
          JSON.stringify(pushPayload),
          { TTL: 3600, urgency: "high" },
        );
        sent++;
      } catch (error: any) {
        failed++;
        const statusCode = error?.statusCode;
        if (statusCode === 404 || statusCode === 410) {
          staleIds.push(sub.id);
        }
      }
    }

    // Cleanup stale subscriptions
    if (staleIds.length > 0) {
      await supabase
        .from("push_subscriptions")
        .delete()
        .in("id", staleIds);
    }

    return json({
      sent,
      failed,
      total: filteredSubs.length,
      removed_stale: staleIds.length,
      groupKey,
    });
  } catch (error: any) {
    console.error("send-ac-notification error:", error);
    return json({ error: error?.message || "Unknown error" }, 500);
  }
});

async function getVapidKeys(supabase: ReturnType<typeof createClient>) {
  const { data, error } = await supabase
    .from("admin_config_text")
    .select("config_key, config_value")
    .in("config_key", ["vapid_public_key", "vapid_private_key"]);

  if (error) throw error;

  const keyMap = new Map(
    (data ?? []).map((row: any) => [row.config_key, row.config_value]),
  );
  const publicKey = keyMap.get("vapid_public_key");
  const privateKey = keyMap.get("vapid_private_key");

  if (publicKey && privateKey) {
    return { publicKey, privateKey };
  }

  // Auto-generate if missing
  const generated = webpush.generateVAPIDKeys();
  await supabase.from("admin_config_text").upsert(
    [
      {
        config_key: "vapid_public_key",
        config_value: generated.publicKey,
        description: "Web Push VAPID public key",
        is_enabled: true,
      },
      {
        config_key: "vapid_private_key",
        config_value: generated.privateKey,
        description: "Web Push VAPID private key",
        is_enabled: true,
      },
    ],
    { onConflict: "config_key" },
  );

  return generated;
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
