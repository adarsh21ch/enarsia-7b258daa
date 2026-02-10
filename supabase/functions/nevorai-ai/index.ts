import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const AI_GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-3-flash-preview";

// ══════════════════════════════════════════════════════════════
// DOMAIN DEFINITIONS — single source of truth
// ══════════════════════════════════════════════════════════════
const DOMAIN_GLOSSARY = `
DOMAIN DEFINITIONS (absolute, never override):
- Enrollment = final_tag_count (the count of people who completed the LAST stage)
- Prospect = any lead that has NOT yet reached the final tag
- Leads = total_leads (new names added to the list)
- Responses = total_responses (prospects who replied / were contacted)
- Day 1, Day 2, Day 3… = stage_tag_1, stage_tag_2, stage_tag_3… from stage_tags JSON
- Final stage = the last stage_tag (its count = final_tag_count = Enrollments)
- Funnel day = funnel_day column (which day of the funnel cycle the user is on)
- Direct team member = a profile whose upline_leader_id matches the requester's user_id
- Personal data = personal_snapshot_v2 (user's own numbers only)
- Team totals = total_snapshot_v2 (includes the user + their entire downline)
- Conversion rate = final_tag_count / total_leads (only when both are in the data)
- Drop-off between stages = stage_tag_N minus stage_tag_(N+1)
`;

// ══════════════════════════════════════════════════════════════
// INTENT CATALOGUE
// ══════════════════════════════════════════════════════════════
const INTENTS = [
  "today_summary",
  "monthly_summary",
  "day_wise_breakdown",
  "team_count",
  "team_performance",
  "top_performers",
  "bottom_performers",
  "funnel_conversion",
  "funnel_dropoff",
  "stage_conversion",      // Day N → Day N+1 conversion
  "enrollment_count",
  "compare_months",
  "general_tips",
  "my_role",               // Am I a leader / member?
] as const;
type Intent = typeof INTENTS[number];

// ══════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════
function monthYearNow(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function dateRange(my: string) {
  const [y, m] = my.split("-").map(Number);
  const last = new Date(y, m, 0).getDate();
  return { start: `${my}-01`, end: `${my}-${String(last).padStart(2, "0")}` };
}
function sumField(rows: any[], f: string): number {
  return rows.reduce((s, r) => s + (typeof r[f] === "number" ? r[f] : 0), 0);
}
function sumTags(rows: any[], f: string): Record<string, number> {
  const t: Record<string, number> = {};
  for (const r of rows) {
    const tags = r[f];
    if (tags && typeof tags === "object") {
      for (const [k, v] of Object.entries(tags)) {
        t[k] = (t[k] || 0) + (typeof v === "number" ? v : 0);
      }
    }
  }
  return t;
}
function agg(rows: any[]) {
  return {
    days_tracked: rows.length,
    total_leads: sumField(rows, "total_leads"),
    total_responses: sumField(rows, "total_responses"),
    total_enrollments: sumField(rows, "final_tag_count"),
  };
}

// ══════════════════════════════════════════════════════════════
// ROLE DETECTION
// ══════════════════════════════════════════════════════════════
interface UserRole {
  role: "leader" | "member";
  userId: string;
  displayName: string;
  neveraiId: string | null;
  teamMemberIds: string[];
  teamMemberNames: string[];
}

async function resolveRole(supabase: any, userId: string): Promise<UserRole> {
  // Fetch own profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, neverai_id, upline_leader_id")
    .eq("user_id", userId)
    .maybeSingle();

  const displayName = profile?.display_name || "Unknown";
  const neveraiId = profile?.neverai_id || null;

  // Find direct team members (people whose upline_leader_id = this user)
  const { data: team } = await supabase
    .from("profiles")
    .select("user_id, display_name")
    .eq("upline_leader_id", userId);

  const members = team || [];

  return {
    role: members.length > 0 ? "leader" : "member",
    userId,
    displayName,
    neveraiId,
    teamMemberIds: members.map((m: any) => m.user_id),
    teamMemberNames: members.map((m: any) => m.display_name || "Unknown"),
  };
}

// ══════════════════════════════════════════════════════════════
// STEP 1 — INTENT DETECTION (tool calling, non-streaming)
// ══════════════════════════════════════════════════════════════
async function detectIntent(
  messages: any[],
  apiKey: string,
  role: UserRole,
): Promise<{ intent: Intent; month_year?: string; compare_month?: string }> {
  const roleHint = role.role === "leader"
    ? `The user is a LEADER with ${role.teamMemberIds.length} direct team members.`
    : `The user is an individual MEMBER (no team).`;

  const resp = await fetch(AI_GATEWAY, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        {
          role: "system",
          content: `You classify questions for NevorAI, a network-marketing CRM.
${roleHint}
${role.role === "member" ? "Team-related intents (team_count, team_performance, top_performers, bottom_performers) are NOT available for this user — use general_tips instead." : ""}

Available intents: ${INTENTS.join(", ")}

Rules:
- today_summary: today's numbers
- monthly_summary: a month's aggregated numbers
- day_wise_breakdown: day-by-day table
- team_count: how many direct team members
- team_performance: each team member's monthly numbers
- top_performers: rank team members best-first
- bottom_performers: rank team members worst-first
- funnel_conversion: total stage-by-stage numbers
- funnel_dropoff: where prospects drop between stages
- stage_conversion: conversion rate from one stage to next (Day 1 → Day 2, etc.)
- enrollment_count: total enrollments for a period
- compare_months: compare two months side-by-side
- general_tips: coaching / advice
- my_role: user asking about their role, team structure

If user mentions a month, extract month_year as YYYY-MM.
If comparing months, also extract compare_month.
Default to current month if none specified.`,
        },
        ...messages.slice(-3),
      ],
      tools: [{
        type: "function",
        function: {
          name: "classify_intent",
          description: "Classify the user's question",
          parameters: {
            type: "object",
            properties: {
              intent: { type: "string", enum: INTENTS },
              month_year: { type: "string", description: "YYYY-MM" },
              compare_month: { type: "string", description: "YYYY-MM for comparison" },
            },
            required: ["intent"],
            additionalProperties: false,
          },
        },
      }],
      tool_choice: { type: "function", function: { name: "classify_intent" } },
    }),
  });

  if (!resp.ok) {
    console.error("Intent detection failed:", resp.status);
    return { intent: "general_tips" };
  }

  try {
    const data = await resp.json();
    const args = JSON.parse(data.choices[0].message.tool_calls[0].function.arguments);
    let intent: Intent = INTENTS.includes(args.intent) ? args.intent : "general_tips";

    // Role guard: block team intents for members
    if (role.role === "member" && ["team_count", "team_performance", "top_performers", "bottom_performers"].includes(intent)) {
      intent = "general_tips";
    }

    return { intent, month_year: args.month_year, compare_month: args.compare_month };
  } catch {
    return { intent: "general_tips" };
  }
}

// ══════════════════════════════════════════════════════════════
// STEP 2 — CONTROLLED DATA FETCHING
// ══════════════════════════════════════════════════════════════
async function fetchData(
  supabase: any,
  role: UserRole,
  intent: Intent,
  monthYear: string,
  compareMonth?: string,
): Promise<{ label: string; data: any }> {
  const { start, end } = dateRange(monthYear);
  const todayStr = new Date().toISOString().split("T")[0];

  // Helper: personal snapshots for a month
  const personalMonth = async (my: string) => {
    const r = dateRange(my);
    const { data } = await supabase
      .from("personal_snapshot_v2")
      .select("date, total_leads, total_responses, response_tags, stage_tags, final_tag_count, funnel_day, final_tag")
      .eq("user_id", role.userId)
      .gte("date", r.start).lte("date", r.end)
      .order("date", { ascending: true });
    return data || [];
  };

  // Helper: team snapshots for a month
  const teamMonth = async (my: string) => {
    if (role.teamMemberIds.length === 0) return [];
    const r = dateRange(my);
    const { data } = await supabase
      .from("personal_snapshot_v2")
      .select("user_id, total_leads, total_responses, final_tag_count, stage_tags")
      .in("user_id", role.teamMemberIds)
      .gte("date", r.start).lte("date", r.end);
    return data || [];
  };

  switch (intent) {
    // ── Personal ──
    case "today_summary": {
      const { data } = await supabase
        .from("personal_snapshot_v2")
        .select("total_leads, total_responses, response_tags, stage_tags, final_tag_count, final_tag, funnel_day")
        .eq("user_id", role.userId).eq("date", todayStr)
        .maybeSingle();
      return {
        label: `Today's Summary (${todayStr})`,
        data: data || { total_leads: 0, total_responses: 0, response_tags: {}, stage_tags: {}, final_tag_count: 0, note: "No data tracked today yet" },
      };
    }

    case "monthly_summary": {
      const rows = await personalMonth(monthYear);
      return {
        label: `Monthly Summary (${monthYear})`,
        data: { ...agg(rows), response_tags: sumTags(rows, "response_tags"), stage_tags: sumTags(rows, "stage_tags") },
      };
    }

    case "day_wise_breakdown": {
      const rows = await personalMonth(monthYear);
      return {
        label: `Day-wise Breakdown (${monthYear})`,
        data: rows.map((r: any) => ({
          date: r.date, leads: r.total_leads || 0, responses: r.total_responses || 0,
          enrollments: r.final_tag_count || 0, funnel_day: r.funnel_day,
        })),
      };
    }

    case "enrollment_count": {
      const rows = await personalMonth(monthYear);
      return { label: `Enrollments (${monthYear})`, data: { total_enrollments: sumField(rows, "final_tag_count"), month: monthYear } };
    }

    case "funnel_conversion": {
      const rows = await personalMonth(monthYear);
      const stages = sumTags(rows, "stage_tags");
      const totalLeads = sumField(rows, "total_leads");
      const enrollments = sumField(rows, "final_tag_count");
      return {
        label: `Funnel Conversion (${monthYear})`,
        data: { total_leads: totalLeads, stage_tags: stages, total_enrollments: enrollments,
          overall_conversion: totalLeads > 0 ? `${((enrollments / totalLeads) * 100).toFixed(1)}%` : "N/A" },
      };
    }

    case "funnel_dropoff": {
      const rows = await personalMonth(monthYear);
      const stages = sumTags(rows, "stage_tags");
      const totalLeads = sumField(rows, "total_leads");
      // Build ordered drop-off: leads → stage1 → stage2 → … → final
      const stageKeys = Object.keys(stages).sort((a, b) => {
        const numA = parseInt(a.replace(/\D/g, "")) || 0;
        const numB = parseInt(b.replace(/\D/g, "")) || 0;
        return numA - numB;
      });
      const dropoff: { from: string; to: string; from_count: number; to_count: number; dropped: number }[] = [];
      let prev = { name: "Total Leads", count: totalLeads };
      for (const key of stageKeys) {
        const count = stages[key];
        dropoff.push({ from: prev.name, to: key, from_count: prev.count, to_count: count, dropped: prev.count - count });
        prev = { name: key, count };
      }
      return { label: `Funnel Drop-off Analysis (${monthYear})`, data: { total_leads: totalLeads, stages, dropoff_steps: dropoff } };
    }

    case "stage_conversion": {
      const rows = await personalMonth(monthYear);
      const stages = sumTags(rows, "stage_tags");
      const totalLeads = sumField(rows, "total_leads");
      const stageKeys = Object.keys(stages).sort((a, b) => {
        const numA = parseInt(a.replace(/\D/g, "")) || 0;
        const numB = parseInt(b.replace(/\D/g, "")) || 0;
        return numA - numB;
      });
      const conversions: { from: string; to: string; rate: string }[] = [];
      let prevCount = totalLeads;
      let prevName = "Total Leads";
      for (const key of stageKeys) {
        const count = stages[key];
        conversions.push({ from: prevName, to: key, rate: prevCount > 0 ? `${((count / prevCount) * 100).toFixed(1)}%` : "N/A" });
        prevCount = count;
        prevName = key;
      }
      return { label: `Stage-to-Stage Conversion (${monthYear})`, data: { total_leads: totalLeads, conversions } };
    }

    case "compare_months": {
      const prevMY = compareMonth || (() => {
        const [y, m] = monthYear.split("-").map(Number);
        return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, "0")}`;
      })();
      const [curr, prev] = await Promise.all([personalMonth(monthYear), personalMonth(prevMY)]);
      return {
        label: `Comparison: ${monthYear} vs ${prevMY}`,
        data: { current: { month: monthYear, ...agg(curr) }, previous: { month: prevMY, ...agg(prev) } },
      };
    }

    // ── Team (leader only — role guard already applied in detectIntent) ──
    case "team_count": {
      return {
        label: "Team Count",
        data: { count: role.teamMemberIds.length, members: role.teamMemberNames },
      };
    }

    case "team_performance": {
      const snapshots = await teamMonth(monthYear);
      const memberMap: Record<string, { name: string; leads: number; responses: number; enrollments: number }> = {};
      for (let i = 0; i < role.teamMemberIds.length; i++) {
        memberMap[role.teamMemberIds[i]] = { name: role.teamMemberNames[i], leads: 0, responses: 0, enrollments: 0 };
      }
      for (const s of snapshots) {
        const e = memberMap[s.user_id];
        if (e) { e.leads += s.total_leads || 0; e.responses += s.total_responses || 0; e.enrollments += s.final_tag_count || 0; }
      }
      return { label: `Team Performance (${monthYear})`, data: { month: monthYear, members: Object.values(memberMap) } };
    }

    case "top_performers":
    case "bottom_performers": {
      const snapshots = await teamMonth(monthYear);
      const memberMap: Record<string, { name: string; leads: number; responses: number; enrollments: number; score: number }> = {};
      for (let i = 0; i < role.teamMemberIds.length; i++) {
        memberMap[role.teamMemberIds[i]] = { name: role.teamMemberNames[i], leads: 0, responses: 0, enrollments: 0, score: 0 };
      }
      for (const s of snapshots) {
        const e = memberMap[s.user_id];
        if (e) { e.leads += s.total_leads || 0; e.responses += s.total_responses || 0; e.enrollments += s.final_tag_count || 0; }
      }
      const list = Object.values(memberMap);
      list.forEach(m => { m.score = m.leads + m.enrollments * 3; }); // Weighted score
      list.sort((a, b) => intent === "top_performers" ? b.score - a.score : a.score - b.score);
      return {
        label: `${intent === "top_performers" ? "Top" : "Bottom"} Performers (${monthYear})`,
        data: { month: monthYear, ranked_members: list },
      };
    }

    case "my_role": {
      return {
        label: "Your Role",
        data: {
          role: role.role,
          display_name: role.displayName,
          direct_team_count: role.teamMemberIds.length,
          team_members: role.role === "leader" ? role.teamMemberNames : [],
        },
      };
    }

    case "general_tips": {
      const rows = await personalMonth(monthYear);
      const a = agg(rows);
      return {
        label: `Performance Summary for Coaching (${monthYear})`,
        data: {
          ...a,
          conversion_rate: a.total_leads > 0 ? `${((a.total_enrollments / a.total_leads) * 100).toFixed(1)}%` : "N/A",
          response_rate: a.total_leads > 0 ? `${((a.total_responses / a.total_leads) * 100).toFixed(1)}%` : "N/A",
          is_leader: role.role === "leader",
          team_size: role.teamMemberIds.length,
        },
      };
    }

    default:
      return { label: "Unknown", data: {} };
  }
}

// ══════════════════════════════════════════════════════════════
// STEP 3 — EXPLANATION (streaming)
// ══════════════════════════════════════════════════════════════
const SYSTEM_PROMPT = `You are NevorAI Assistant — a precise, data-driven AI for network marketers using the NevorAI CRM.

${DOMAIN_GLOSSARY}

CRITICAL RULES:
1. You may ONLY reference numbers explicitly present in the DATA block.
2. If a number is NOT in the data, say "I don't have that information."
3. NEVER estimate, guess, interpolate, or calculate numbers not provided.
4. NEVER reference UI state, localStorage, cookies, or client-side data.
5. NEVER reveal raw JSON, table names, column names, or internal identifiers.
6. When mentioning stages, use the tag names (e.g. "Day 1", "Day 2") not "stage_tag_1".
7. For team data, only discuss members present in the data — never speculate about others.
8. This is READ-ONLY. Never suggest the user can update data via chat.

ROLE AWARENESS:
- If the user is a MEMBER, they can only see their own data. Do not reference team features.
- If the user is a LEADER, they can see their own data + direct team members' data.

FORMATTING:
- Keep responses brief: 2-4 sentences for simple questions, short paragraph for analysis.
- Use tables (markdown) for day-wise or team comparisons when data has 3+ rows.
- Use 1-2 emoji max per response.
- Format numbers clearly (e.g. "45 leads", "12.5% conversion").
- Be encouraging but honest about low numbers.
- Give specific, actionable advice (not generic motivation).
- Respond in the same language the user writes in.`;

// ══════════════════════════════════════════════════════════════
// MAIN HANDLER
// ══════════════════════════════════════════════════════════════
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // ── Auth ──
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { messages, monthYear } = await req.json();
    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: "messages array required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI service not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const defaultMonth = monthYear || monthYearNow();

    // Step 0: Resolve role
    const role = await resolveRole(supabase, user.id);
    console.log(`User: ${role.displayName}, Role: ${role.role}, Team: ${role.teamMemberIds.length}`);

    // Step 1: Detect intent
    const { intent, month_year, compare_month } = await detectIntent(messages, LOVABLE_API_KEY, role);
    const targetMonth = month_year || defaultMonth;
    console.log(`Intent: ${intent}, Month: ${targetMonth}, Compare: ${compare_month}`);

    // Step 2: Fetch data
    const { label, data } = await fetchData(supabase, role, intent, targetMonth, compare_month);

    // Step 3: Stream explanation
    const roleContext = role.role === "leader"
      ? `\nUSER ROLE: Leader with ${role.teamMemberIds.length} direct team members.`
      : `\nUSER ROLE: Individual member (no team access).`;

    const dataBlock = `${roleContext}\n\n--- DATA: ${label} ---\n${JSON.stringify(data, null, 2)}\n--- END DATA ---`;

    const aiResponse = await fetch(AI_GATEWAY, {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: "system", content: SYSTEM_PROMPT + dataBlock }, ...messages],
        stream: true,
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      console.error("AI gateway error:", aiResponse.status, await aiResponse.text());
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(aiResponse.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("nevorai-ai error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
