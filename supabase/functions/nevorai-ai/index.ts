import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const AI_GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-3-flash-preview";

// ── Intent definitions ──
const INTENTS = [
  "today_summary",
  "monthly_summary",
  "day_wise_breakdown",
  "team_count",
  "team_performance",
  "top_performers",
  "funnel_conversion",
  "enrollment_count",
  "compare_months",
  "general_tips",
] as const;

type Intent = typeof INTENTS[number];

// ── Helpers ──
function monthYearFromDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function dateRange(monthYear: string) {
  const [year, month] = monthYear.split("-").map(Number);
  const lastDay = new Date(year, month, 0).getDate();
  return {
    start: `${monthYear}-01`,
    end: `${monthYear}-${String(lastDay).padStart(2, "0")}`,
  };
}

function sumTags(rows: any[], field: string): Record<string, number> {
  const totals: Record<string, number> = {};
  for (const r of rows) {
    const tags = r[field];
    if (tags && typeof tags === "object") {
      for (const [k, v] of Object.entries(tags)) {
        totals[k] = (totals[k] || 0) + (typeof v === "number" ? v : 0);
      }
    }
  }
  return totals;
}

function sumField(rows: any[], field: string): number {
  return rows.reduce((s, r) => s + (typeof r[field] === "number" ? r[field] : 0), 0);
}

// ── Step 1: Intent Detection via tool calling ──
async function detectIntent(
  messages: any[],
  apiKey: string,
): Promise<{ intent: Intent; month_year?: string; compare_month?: string }> {
  const resp = await fetch(AI_GATEWAY, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        {
          role: "system",
          content: `You are an intent classifier for a CRM/tracking app called NevorAI. Classify the user's question into exactly one intent using the classify_intent tool. Available intents:
- today_summary: asking about today's numbers
- monthly_summary: asking about this month or a specific month overall
- day_wise_breakdown: wanting a day-by-day table for a month
- team_count: how many team members
- team_performance: team members' numbers
- top_performers: ranking team members
- funnel_conversion: stage-by-stage conversion
- enrollment_count: total enrollments
- compare_months: comparing two months
- general_tips: asking for advice/tips

If the user mentions a specific month (e.g. "January", "Jan 2025", "last month"), extract month_year as YYYY-MM format.
If they want to compare months, also extract compare_month.
Default month_year to current month if not specified.`,
        },
        ...messages.slice(-3), // Only last few messages for intent
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "classify_intent",
            description: "Classify the user's question into a known intent",
            parameters: {
              type: "object",
              properties: {
                intent: { type: "string", enum: INTENTS },
                month_year: { type: "string", description: "YYYY-MM format, e.g. 2025-02" },
                compare_month: { type: "string", description: "YYYY-MM for comparison month" },
              },
              required: ["intent"],
              additionalProperties: false,
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "classify_intent" } },
    }),
  });

  if (!resp.ok) {
    console.error("Intent detection failed:", resp.status);
    return { intent: "general_tips" };
  }

  const data = await resp.json();
  try {
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    const args = JSON.parse(toolCall.function.arguments);
    return {
      intent: INTENTS.includes(args.intent) ? args.intent : "general_tips",
      month_year: args.month_year,
      compare_month: args.compare_month,
    };
  } catch {
    return { intent: "general_tips" };
  }
}

// ── Step 2: Fetch data based on intent ──
async function fetchDataForIntent(
  supabase: any,
  userId: string,
  intent: Intent,
  monthYear: string,
  compareMonth?: string,
): Promise<{ label: string; data: any }> {
  const { start, end } = dateRange(monthYear);
  const todayStr = new Date().toISOString().split("T")[0];

  switch (intent) {
    case "today_summary": {
      const { data } = await supabase
        .from("personal_snapshot_v2")
        .select("total_leads, total_responses, response_tags, stage_tags, final_tag_count, final_tag, funnel_day")
        .eq("user_id", userId)
        .eq("date", todayStr)
        .maybeSingle();
      return {
        label: `Today's Summary (${todayStr})`,
        data: data || { total_leads: 0, total_responses: 0, response_tags: {}, stage_tags: {}, final_tag_count: 0 },
      };
    }

    case "monthly_summary": {
      const { data: rows } = await supabase
        .from("personal_snapshot_v2")
        .select("total_leads, total_responses, response_tags, stage_tags, final_tag_count")
        .eq("user_id", userId)
        .gte("date", start)
        .lte("date", end);
      const r = rows || [];
      return {
        label: `Monthly Summary (${monthYear})`,
        data: {
          days_tracked: r.length,
          total_leads: sumField(r, "total_leads"),
          total_responses: sumField(r, "total_responses"),
          total_enrollments: sumField(r, "final_tag_count"),
          response_tags: sumTags(r, "response_tags"),
          stage_tags: sumTags(r, "stage_tags"),
        },
      };
    }

    case "day_wise_breakdown": {
      const { data: rows } = await supabase
        .from("personal_snapshot_v2")
        .select("date, total_leads, total_responses, final_tag_count, funnel_day")
        .eq("user_id", userId)
        .gte("date", start)
        .lte("date", end)
        .order("date", { ascending: true });
      return {
        label: `Day-wise Breakdown (${monthYear})`,
        data: (rows || []).map((r: any) => ({
          date: r.date,
          leads: r.total_leads || 0,
          responses: r.total_responses || 0,
          enrollments: r.final_tag_count || 0,
          funnel_day: r.funnel_day,
        })),
      };
    }

    case "team_count": {
      // Get user's profile to find their leader_id / neverai_id
      const { data: profile } = await supabase
        .from("profiles")
        .select("user_id, neverai_id")
        .eq("user_id", userId)
        .maybeSingle();

      // Team = profiles where leaders_id_of_my_leader matches user's neverai_id OR user_id
      const lookupId = profile?.neverai_id || userId;
      const { data: team } = await supabase
        .from("profiles")
        .select("display_name, user_id")
        .eq("leaders_id_of_my_leader", lookupId);
      return {
        label: "Team Count",
        data: {
          count: (team || []).length,
          members: (team || []).map((m: any) => m.display_name || "Unknown"),
        },
      };
    }

    case "team_performance":
    case "top_performers": {
      const { data: profile } = await supabase
        .from("profiles")
        .select("neverai_id")
        .eq("user_id", userId)
        .maybeSingle();

      const lookupId = profile?.neverai_id || userId;
      const { data: team } = await supabase
        .from("profiles")
        .select("display_name, user_id")
        .eq("leaders_id_of_my_leader", lookupId);

      if (!team || team.length === 0) {
        return { label: "Team Performance", data: { message: "No team members found", members: [] } };
      }

      const teamIds = team.map((m: any) => m.user_id);
      const { data: snapshots } = await supabase
        .from("personal_snapshot_v2")
        .select("user_id, total_leads, total_responses, final_tag_count")
        .in("user_id", teamIds)
        .gte("date", start)
        .lte("date", end);

      const memberMap: Record<string, { name: string; leads: number; responses: number; enrollments: number }> = {};
      for (const m of team) {
        memberMap[m.user_id] = { name: m.display_name || "Unknown", leads: 0, responses: 0, enrollments: 0 };
      }
      for (const s of snapshots || []) {
        const entry = memberMap[s.user_id];
        if (entry) {
          entry.leads += s.total_leads || 0;
          entry.responses += s.total_responses || 0;
          entry.enrollments += s.final_tag_count || 0;
        }
      }

      let members = Object.values(memberMap);
      if (intent === "top_performers") {
        members.sort((a, b) => (b.leads + b.enrollments) - (a.leads + a.enrollments));
      }

      return {
        label: intent === "top_performers" ? `Top Performers (${monthYear})` : `Team Performance (${monthYear})`,
        data: { month: monthYear, members },
      };
    }

    case "funnel_conversion": {
      const { data: rows } = await supabase
        .from("personal_snapshot_v2")
        .select("stage_tags, total_leads, final_tag_count")
        .eq("user_id", userId)
        .gte("date", start)
        .lte("date", end);
      const r = rows || [];
      return {
        label: `Funnel Conversion (${monthYear})`,
        data: {
          total_leads: sumField(r, "total_leads"),
          total_enrollments: sumField(r, "final_tag_count"),
          stage_tags: sumTags(r, "stage_tags"),
        },
      };
    }

    case "enrollment_count": {
      const { data: rows } = await supabase
        .from("personal_snapshot_v2")
        .select("final_tag_count")
        .eq("user_id", userId)
        .gte("date", start)
        .lte("date", end);
      return {
        label: `Enrollment Count (${monthYear})`,
        data: { total_enrollments: sumField(rows || [], "final_tag_count"), month: monthYear },
      };
    }

    case "compare_months": {
      const prevMonth = compareMonth || (() => {
        const [y, m] = monthYear.split("-").map(Number);
        const prev = m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, "0")}`;
        return prev;
      })();
      const { start: s1, end: e1 } = dateRange(monthYear);
      const { start: s2, end: e2 } = dateRange(prevMonth);

      const [{ data: curr }, { data: prev }] = await Promise.all([
        supabase.from("personal_snapshot_v2").select("total_leads, total_responses, final_tag_count").eq("user_id", userId).gte("date", s1).lte("date", e1),
        supabase.from("personal_snapshot_v2").select("total_leads, total_responses, final_tag_count").eq("user_id", userId).gte("date", s2).lte("date", e2),
      ]);

      const agg = (rows: any[]) => ({
        leads: sumField(rows, "total_leads"),
        responses: sumField(rows, "total_responses"),
        enrollments: sumField(rows, "final_tag_count"),
        days: rows.length,
      });

      return {
        label: `Month Comparison: ${monthYear} vs ${prevMonth}`,
        data: { current: { month: monthYear, ...agg(curr || []) }, previous: { month: prevMonth, ...agg(prev || []) } },
      };
    }

    case "general_tips": {
      // Fetch a brief summary for coaching context
      const { data: rows } = await supabase
        .from("personal_snapshot_v2")
        .select("total_leads, total_responses, final_tag_count")
        .eq("user_id", userId)
        .gte("date", start)
        .lte("date", end);
      const r = rows || [];
      return {
        label: `Performance Summary for Coaching (${monthYear})`,
        data: {
          days_tracked: r.length,
          total_leads: sumField(r, "total_leads"),
          total_responses: sumField(r, "total_responses"),
          total_enrollments: sumField(r, "final_tag_count"),
          conversion_rate: r.length > 0 ? `${((sumField(r, "final_tag_count") / Math.max(sumField(r, "total_leads"), 1)) * 100).toFixed(1)}%` : "N/A",
        },
      };
    }

    default:
      return { label: "Unknown", data: {} };
  }
}

// ── Step 3: Stream explanation ──
const EXPLANATION_SYSTEM_PROMPT = `You are NevorAI Assistant — a smart, concise AI assistant for a CRM & performance tracker used by network marketers.

CRITICAL RULES:
1. You may ONLY reference the numbers in the DATA block below.
2. If a number is not in the data, say "I don't have that information."
3. NEVER estimate, guess, or calculate numbers not explicitly provided.
4. NEVER reference UI state, localStorage, or any client-side data.

DOMAIN DEFINITIONS:
- Enrollment = final_tag_count (the count of people who reached the final stage)
- Direct team member = a profile whose leaders_id_of_my_leader = user's neverai_id
- Day 1, Day 2, etc. = stage_tag_1, stage_tag_2... from the stage_tags JSON
- Personal data = from personal_snapshot_v2 (user's own numbers)
- Total (with team) = from total_snapshot_v2 (includes downline)
- Leads = total_leads (number of new prospects added)
- Responses = total_responses (number of prospects who responded)

FORMATTING:
- Keep responses brief (2-4 sentences for simple questions, short paragraph for analysis)
- Use emoji sparingly (1-2 max)
- Format numbers clearly
- Be encouraging but honest
- Respond in the same language the user writes in`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ── Auth ──
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
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
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = user.id;

    const { messages, monthYear } = await req.json();
    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: "messages array required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI service not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const now = new Date();
    const defaultMonth = monthYear || monthYearFromDate(now);

    // Step 1: Detect intent
    const { intent, month_year, compare_month } = await detectIntent(messages, LOVABLE_API_KEY);
    const targetMonth = month_year || defaultMonth;
    console.log(`Intent: ${intent}, month: ${targetMonth}, compare: ${compare_month}`);

    // Step 2: Fetch data
    const { label, data } = await fetchDataForIntent(supabase, userId, intent, targetMonth, compare_month);

    // Step 3: Stream explanation
    const dataBlock = `\n\n--- DATA: ${label} ---\n${JSON.stringify(data, null, 2)}\n--- END DATA ---`;

    const aiResponse = await fetch(AI_GATEWAY, {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: EXPLANATION_SYSTEM_PROMPT + dataBlock },
          ...messages,
        ],
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
      const errText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errText);
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
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
