import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    // 1. Validate bridge secret
    const expectedSecret = Deno.env.get("NFLOW_BRIDGE_SECRET");
    const authHeader = req.headers.get("Authorization") ?? req.headers.get("authorization");

    if (!expectedSecret) {
      console.error("NFLOW_BRIDGE_SECRET not configured");
      return json({ error: "Server misconfigured" }, 500);
    }

    if (!authHeader || authHeader !== `Bearer ${expectedSecret}`) {
      return json({ error: "Unauthorized" }, 401);
    }

    // 2. Parse and validate body
    let body: { email?: string; phone?: string };
    try {
      body = await req.json();
    } catch {
      return json({ error: "Invalid JSON body" }, 400);
    }

    const email = (body.email || "").toString().toLowerCase().trim();
    const phone = (body.phone || "").toString().trim();

    if (!email && !phone) {
      return json({ error: "email or phone required" }, 400);
    }

    // 3. Lookup profile by email OR phone
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const orParts: string[] = [];
    if (email) orParts.push(`email.eq.${email}`);
    if (phone) {
      // Try multiple common phone columns/formats
      orParts.push(`phone.eq.${phone}`);
      orParts.push(`whatsapp_number.eq.${phone}`);
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("user_id, email, display_name, full_name, created_at, subscription_plan, subscription_status, subscription_expires_at")
      .or(orParts.join(","))
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (profileError) {
      console.error("Profile lookup error:", profileError.message);
      return json({ error: "Lookup failed" }, 500);
    }

    if (!profile) {
      return json({
        isPro: false,
        plan: "none",
        fullName: null,
        registeredAt: null,
      });
    }

    // 4. Determine pro status — prefer user_subscriptions, fallback to profile fields
    let plan: string = (profile.subscription_plan || "free").toLowerCase();
    let status: string = (profile.subscription_status || "inactive").toLowerCase();
    let expiresAt: string | null = profile.subscription_expires_at ?? null;

    const { data: sub } = await supabase
      .from("user_subscriptions")
      .select("plan, status, expires_at, is_admin_override")
      .eq("user_id", profile.user_id)
      .maybeSingle();

    if (sub) {
      plan = (sub.plan || plan).toLowerCase();
      status = (sub.status || status).toLowerCase();
      expiresAt = sub.expires_at ?? expiresAt;
    }

    // Active = pro/individual tier AND (no expiry OR expiry in future) AND status active-ish
    const now = new Date();
    const notExpired = !expiresAt || new Date(expiresAt) > now;
    const paidPlan = ["pro", "individual", "premium", "mini"].includes(plan);
    const activeStatus = ["active", "trialing"].includes(status) || status === "" || !status;

    const isPro = paidPlan && notExpired && activeStatus;

    return json({
      isPro,
      plan: isPro ? "pro" : "none",
      fullName: profile.full_name || profile.display_name || null,
      registeredAt: profile.created_at,
    });
  } catch (err) {
    console.error("is-pro-user error:", err);
    return json({ error: "Internal server error" }, 500);
  }
});
