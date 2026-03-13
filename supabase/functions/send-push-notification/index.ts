import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type PushRow = {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth_key: string;
};

type SendAction = "get-public-key" | "test-self" | "send-to-user";

type RequestBody = {
  action?: SendAction;
  title?: string;
  body?: string;
  url?: string;
  user_id?: string; // for send-to-user action
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const token = getBearerToken(req);
    if (!token) {
      return json({ error: "Unauthorized" }, 401);
    }

    const { data: authData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !authData.user) {
      return json({ error: "Unauthorized" }, 401);
    }

    const user = authData.user;
    const payload: RequestBody = await req.json().catch(() => ({}));

    const vapidKeys = await ensureVapidKeys(supabase);

    if (payload.action === "get-public-key") {
      return json({ publicKey: vapidKeys.publicKey });
    }

    webpush.setVapidDetails(
      "mailto:teamnevorai@gmail.com",
      vapidKeys.publicKey,
      vapidKeys.privateKey,
    );

    if (payload.action === "test-self") {
      const { data: selfSubs, error: selfError } = await supabase
        .from("push_subscriptions")
        .select("id, user_id, endpoint, p256dh, auth_key")
        .eq("user_id", user.id);

      if (selfError) throw selfError;

      const result = await sendToSubscriptions(
        supabase,
        (selfSubs ?? []) as PushRow[],
        {
          title: "Test Push ✅",
          body: "Your push notifications are working on this device.",
          url: "/profile",
        },
      );

      return json({ mode: "test-self", ...result });
    }

    const { data: isAdmin, error: adminCheckError } = await supabase.rpc("has_role", {
      _user_id: user.id,
      _role: "admin",
    });

    if (adminCheckError || !isAdmin) {
      return json({ error: "Admin access required" }, 403);
    }

    const title = payload.title?.trim();
    const body = payload.body?.trim();

    if (!title || !body) {
      return json({ error: "Title and body are required" }, 400);
    }

    const { data: allSubs, error: subsError } = await supabase
      .from("push_subscriptions")
      .select("id, user_id, endpoint, p256dh, auth_key");

    if (subsError) throw subsError;

    const result = await sendToSubscriptions(
      supabase,
      (allSubs ?? []) as PushRow[],
      {
        title,
        body,
        url: payload.url?.trim() || "/",
      },
    );

    await supabase.from("admin_notifications").insert({
      title,
      body,
      sent_by: user.id,
      recipient_count: result.sent,
    });

    return json({ mode: "broadcast", ...result });
  } catch (error: any) {
    console.error("send-push-notification error:", error);
    return json({ error: error?.message || "Unknown error" }, 500);
  }
});

async function ensureVapidKeys(supabase: ReturnType<typeof createClient>) {
  const { data, error } = await supabase
    .from("admin_config_text")
    .select("config_key, config_value")
    .in("config_key", ["vapid_public_key", "vapid_private_key"]);

  if (error) throw error;

  const keyMap = new Map((data ?? []).map((row) => [row.config_key, row.config_value]));
  const publicKey = keyMap.get("vapid_public_key");
  const privateKey = keyMap.get("vapid_private_key");

  if (publicKey && privateKey) {
    return { publicKey, privateKey };
  }

  const generated = webpush.generateVAPIDKeys();

  const { error: upsertError } = await supabase.from("admin_config_text").upsert(
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

  if (upsertError) throw upsertError;

  return generated;
}

async function sendToSubscriptions(
  supabase: ReturnType<typeof createClient>,
  subscriptions: PushRow[],
  payload: { title: string; body: string; url: string },
) {
  let sent = 0;
  let failed = 0;
  const staleIds: string[] = [];

  for (const sub of subscriptions) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth_key,
          },
        },
        JSON.stringify(payload),
        {
          TTL: 60 * 60,
          urgency: "high",
        },
      );
      sent += 1;
    } catch (error: any) {
      failed += 1;
      const statusCode = error?.statusCode;
      const endpoint = error?.endpoint || sub.endpoint;
      console.error("Push send failed", { statusCode, endpoint, body: error?.body });

      if (statusCode === 404 || statusCode === 410) {
        staleIds.push(sub.id);
      }
    }
  }

  if (staleIds.length > 0) {
    const { error } = await supabase
      .from("push_subscriptions")
      .delete()
      .in("id", staleIds);

    if (error) {
      console.error("Failed to cleanup stale subscriptions:", error);
    }
  }

  return {
    total: subscriptions.length,
    sent,
    failed,
    removed_stale: staleIds.length,
  };
}

function getBearerToken(req: Request) {
  const authHeader = req.headers.get("Authorization") || "";
  if (!authHeader.startsWith("Bearer ")) return null;
  return authHeader.replace("Bearer ", "").trim();
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}
