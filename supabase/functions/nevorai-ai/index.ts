import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const AI_GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-3-flash-preview";
const MAX_TOOL_ITERATIONS = 5;
const RATE_LIMIT_PER_HOUR = 50;

// In-memory rate limit (resets on cold start, good enough for edge)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(userId);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + 3600000 });
    return true;
  }
  if (entry.count >= RATE_LIMIT_PER_HOUR) return false;
  entry.count++;
  return true;
}

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
function todayStr(): string {
  return new Date().toISOString().split("T")[0];
}

// ══════════════════════════════════════════════════════════════
// LABEL RESOLUTION — map slot keys to human-readable names
// ══════════════════════════════════════════════════════════════
interface LabelMap {
  responseLabels: string[];
  stageLabels: string[];
  enrollmentSlotKey: string | null; // e.g. "response_tag_2" for the enrollment tag
}

function parseLabels(raw: any): string[] {
  if (!raw) return [];
  if (typeof raw === "string") {
    try { raw = JSON.parse(raw); } catch { return []; }
  }
  if (Array.isArray(raw)) {
    return raw.map((item: any) => (typeof item === "object" && item?.name) ? item.name : String(item));
  }
  if (typeof raw === "object") {
    // Handle {tracking: [{name: "Video Sent"}, ...]} format
    if (Array.isArray(raw.tracking)) {
      return raw.tracking.map((t: any) => (typeof t === "object" && t?.name) ? t.name : String(t));
    }
    // Handle {stages: [{name: "Day 1"}, ...]} format
    if (Array.isArray(raw.stages)) {
      return raw.stages.map((s: any) => (typeof s === "object" && s?.name) ? s.name : String(s));
    }
  }
  return [];
}

function findEnrollmentSlotKey(raw: any): string | null {
  if (!raw) return null;
  if (typeof raw === "string") {
    try { raw = JSON.parse(raw); } catch { return null; }
  }
  const tracking = raw?.tracking;
  if (!Array.isArray(tracking)) return null;
  for (let i = 0; i < tracking.length; i++) {
    const entry = tracking[i];
    if (typeof entry === "object" && (entry.isStageTag === true || entry.isFinalTarget === true)) {
      return `response_tag_${i + 1}`;
    }
  }
  return null;
}

async function resolveLabels(supabase: any, userId: string): Promise<LabelMap> {
  let currentId = userId;
  const visited = new Set<string>();
  
  for (let i = 0; i < 10; i++) {
    if (visited.has(currentId)) break;
    visited.add(currentId);
    
    const { data: profile } = await supabase
      .from("profiles")
      .select("response_labels, stage_labels, upline_email")
      .eq("user_id", currentId)
      .maybeSingle();
    
    if (!profile) break;
    
    const rLabels = parseLabels(profile.response_labels);
    const sLabels = parseLabels(profile.stage_labels);
    
    if (rLabels.length > 0 || sLabels.length > 0) {
      const enrollmentSlotKey = findEnrollmentSlotKey(profile.response_labels);
      return { responseLabels: rLabels, stageLabels: sLabels, enrollmentSlotKey };
    }
    
    // Walk up via upline_email → find the leader's user_id
    if (profile.upline_email) {
      const { data: uplineProfile } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("email", profile.upline_email)
        .maybeSingle();
      if (uplineProfile) {
        currentId = uplineProfile.user_id;
      } else {
        break;
      }
    } else {
      break;
    }
  }
  
  return { responseLabels: [], stageLabels: [], enrollmentSlotKey: null };
}

function resolveTagNames(tags: Record<string, number>, labels: string[], prefix: string): Record<string, number> {
  const result: Record<string, number> = {};
  for (const [key, value] of Object.entries(tags)) {
    const match = key.match(new RegExp(`^${prefix}_(\\d+)$`));
    if (match) {
      const idx = parseInt(match[1]) - 1;
      const name = labels[idx] || key;
      result[name] = value;
    } else {
      result[key] = value; // Already a human name
    }
  }
  return result;
}

// ══════════════════════════════════════════════════════════════
// TEAM DISCOVERY — dual filter matching dashboard logic
// ══════════════════════════════════════════════════════════════
interface TeamMember {
  user_id: string;
  display_name: string;
}

async function discoverTeam(supabase: any, userId: string): Promise<TeamMember[]> {
  // Get leader's profile for email and neverai_id
  const { data: leaderProfile } = await supabase
    .from("profiles")
    .select("email, neverai_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (!leaderProfile) return [];

  const leaderEmail = leaderProfile.email;
  const leaderId = leaderProfile.neverai_id;

  // Dual filter: upline_email OR leaders_id_of_my_leader
  // We need to do two queries and merge since Supabase doesn't support OR across columns easily
  const queries: Promise<any>[] = [];

  if (leaderEmail) {
    queries.push(
      supabase
        .from("profiles")
        .select("user_id, display_name")
        .eq("upline_email", leaderEmail)
        .eq("allow_leader_to_view", true)
    );
  }

  if (leaderId) {
    queries.push(
      supabase
        .from("profiles")
        .select("user_id, display_name")
        .eq("leaders_id_of_my_leader", leaderId)
        .eq("allow_leader_to_view", true)
    );
  }

  const results = await Promise.all(queries);
  const memberMap = new Map<string, string>();
  
  for (const result of results) {
    const data = result.data || [];
    for (const m of data) {
      if (m.user_id !== userId) {
        memberMap.set(m.user_id, m.display_name || "Unknown");
      }
    }
  }

  return Array.from(memberMap.entries()).map(([user_id, display_name]) => ({
    user_id,
    display_name,
  }));
}

// ══════════════════════════════════════════════════════════════
// TOOL DEFINITIONS
// ══════════════════════════════════════════════════════════════
const TOOLS = [
  {
    type: "function",
    function: {
      name: "get_snapshot_kpis",
      description: "Get the user's KPIs (leads, responses, enrollments, tag breakdowns) for a date range. Uses total (personal+team) data by default.",
      parameters: {
        type: "object",
        properties: {
          start_date: { type: "string", description: "YYYY-MM-DD" },
          end_date: { type: "string", description: "YYYY-MM-DD" },
          source: { type: "string", enum: ["total", "personal"], description: "Data source: 'total' (default, matches dashboard Total view) or 'personal' (user's own data only)" },
        },
        required: ["start_date", "end_date"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_team_kpis",
      description: "Get aggregated KPIs for all team members for a date range (leaders only)",
      parameters: {
        type: "object",
        properties: {
          start_date: { type: "string", description: "YYYY-MM-DD" },
          end_date: { type: "string", description: "YYYY-MM-DD" },
        },
        required: ["start_date", "end_date"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_team_members",
      description: "List all direct team members with their names (leaders only)",
      parameters: { type: "object", properties: {}, additionalProperties: false },
    },
  },
  {
    type: "function",
    function: {
      name: "get_member_kpis",
      description: "Get a specific team member's KPIs for a date range (leaders only)",
      parameters: {
        type: "object",
        properties: {
          member_name: { type: "string", description: "Display name of the team member" },
          start_date: { type: "string", description: "YYYY-MM-DD" },
          end_date: { type: "string", description: "YYYY-MM-DD" },
        },
        required: ["member_name", "start_date", "end_date"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_rankings",
      description: "Get team members ranked by a metric (leaders only)",
      parameters: {
        type: "object",
        properties: {
          metric: { type: "string", enum: ["total_leads", "total_responses", "enrollments"], description: "Metric to rank by" },
          start_date: { type: "string", description: "YYYY-MM-DD" },
          end_date: { type: "string", description: "YYYY-MM-DD" },
          order: { type: "string", enum: ["top", "bottom"], description: "Ranking order" },
        },
        required: ["metric", "start_date", "end_date", "order"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_prospects",
      description: "Search the user's prospect list by name, status, or response tag",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Name or keyword to search" },
          status: { type: "string", enum: ["new", "contacted", "follow_up", "enrolled", "not_interested"], description: "Filter by status" },
          limit: { type: "number", description: "Max results (default 10)" },
        },
        required: [],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_prospect_details",
      description: "Get full details of a specific prospect by name",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Prospect name to look up" },
        },
        required: ["name"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_funnel_stages",
      description: "Get stage-by-stage funnel breakdown for a date range. Uses total data by default.",
      parameters: {
        type: "object",
        properties: {
          start_date: { type: "string", description: "YYYY-MM-DD" },
          end_date: { type: "string", description: "YYYY-MM-DD" },
          source: { type: "string", enum: ["total", "personal"], description: "Data source: 'total' (default) or 'personal'" },
        },
        required: ["start_date", "end_date"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_conversion_rates",
      description: "Get conversion rates between funnel stages for a date range. Uses total data by default.",
      parameters: {
        type: "object",
        properties: {
          start_date: { type: "string", description: "YYYY-MM-DD" },
          end_date: { type: "string", description: "YYYY-MM-DD" },
          source: { type: "string", enum: ["total", "personal"], description: "Data source: 'total' (default) or 'personal'" },
        },
        required: ["start_date", "end_date"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_tracking_status",
      description: "Get the user's current tracking status including streak, funnel day, and today's progress",
      parameters: { type: "object", properties: {}, additionalProperties: false },
    },
  },
];

// Helper: compute enrollments from response_tags using enrollmentSlotKey
function computeEnrollments(rows: any[], labels: LabelMap): number {
  if (labels.enrollmentSlotKey) {
    let total = 0;
    for (const r of rows) {
      if (r.response_tags && typeof r.response_tags === "object") {
        total += (typeof r.response_tags[labels.enrollmentSlotKey] === "number" ? r.response_tags[labels.enrollmentSlotKey] : 0);
      }
    }
    return total;
  }
  // Fallback to final_tag_count
  return rows.reduce((s: number, r: any) => s + (r.final_tag_count || 0), 0);
}

function snapshotTable(source?: string): string {
  return source === "personal" ? "personal_snapshot_v2" : "total_snapshot_v2";
}

async function executeTool(
  name: string,
  args: any,
  supabase: any,
  userId: string,
  team: TeamMember[],
  labels: LabelMap,
): Promise<string> {
  try {
    switch (name) {
      case "get_snapshot_kpis": {
        const table = snapshotTable(args.source);
        const { data } = await supabase
          .from(table)
          .select("date, total_leads, total_responses, response_tags, stage_tags, final_tag_count, funnel_day, final_tag")
          .eq("user_id", userId)
          .gte("date", args.start_date)
          .lte("date", args.end_date)
          .order("date", { ascending: true });
        
        const rows = data || [];
        const totalLeads = rows.reduce((s: number, r: any) => s + (r.total_leads || 0), 0);
        const totalResponses = rows.reduce((s: number, r: any) => s + (r.total_responses || 0), 0);
        const totalEnrollments = computeEnrollments(rows, labels);
        
        const rawResponseTags: Record<string, number> = {};
        const rawStageTags: Record<string, number> = {};
        for (const r of rows) {
          if (r.response_tags && typeof r.response_tags === "object") {
            for (const [k, v] of Object.entries(r.response_tags)) {
              rawResponseTags[k] = (rawResponseTags[k] || 0) + (typeof v === "number" ? v : 0);
            }
          }
          if (r.stage_tags && typeof r.stage_tags === "object") {
            for (const [k, v] of Object.entries(r.stage_tags)) {
              rawStageTags[k] = (rawStageTags[k] || 0) + (typeof v === "number" ? v : 0);
            }
          }
        }
        
        const responseTags = resolveTagNames(rawResponseTags, labels.responseLabels, "response_tag");
        const stageTags = resolveTagNames(rawStageTags, labels.stageLabels, "stage_tag");
        
        return JSON.stringify({
          source: table,
          period: `${args.start_date} to ${args.end_date}`,
          days_tracked: rows.length,
          total_leads: totalLeads,
          total_responses: totalResponses,
          total_enrollments: totalEnrollments,
          response_breakdown: responseTags,
          stage_breakdown: stageTags,
          conversion_rate: totalLeads > 0 ? `${((totalEnrollments / totalLeads) * 100).toFixed(1)}%` : "N/A",
        });
      }

      case "get_team_kpis": {
        if (team.length === 0) return JSON.stringify({ error: "No team members found. You may be a member, not a leader." });
        
        const memberIds = team.map(m => m.user_id);
        const { data } = await supabase
          .from("personal_snapshot_v2")
          .select("user_id, total_leads, total_responses, response_tags")
          .in("user_id", memberIds)
          .gte("date", args.start_date)
          .lte("date", args.end_date);
        
        const rows = data || [];
        const memberAgg: Record<string, { name: string; leads: number; responses: number; enrollments: number }> = {};
        for (const m of team) {
          memberAgg[m.user_id] = { name: m.display_name, leads: 0, responses: 0, enrollments: 0 };
        }
        for (const r of rows) {
          const m = memberAgg[r.user_id];
          if (m) {
            m.leads += r.total_leads || 0;
            m.responses += r.total_responses || 0;
            // Compute enrollment from response_tags
            if (labels.enrollmentSlotKey && r.response_tags && typeof r.response_tags === "object") {
              m.enrollments += (typeof r.response_tags[labels.enrollmentSlotKey] === "number" ? r.response_tags[labels.enrollmentSlotKey] : 0);
            } else {
              // No slot key, skip (final_tag_count is unreliable)
            }
          }
        }
        
        const members = Object.values(memberAgg);
        return JSON.stringify({
          period: `${args.start_date} to ${args.end_date}`,
          team_size: team.length,
          grand_total_leads: members.reduce((s, m) => s + m.leads, 0),
          grand_total_responses: members.reduce((s, m) => s + m.responses, 0),
          grand_total_enrollments: members.reduce((s, m) => s + m.enrollments, 0),
          per_member: members,
        });
      }

      case "list_team_members": {
        return JSON.stringify({
          team_size: team.length,
          members: team.map(m => m.display_name),
        });
      }

      case "get_member_kpis": {
        const member = team.find(m => m.display_name.toLowerCase().includes(args.member_name.toLowerCase()));
        if (!member) return JSON.stringify({ error: `Member "${args.member_name}" not found in your team.` });
        
        const { data } = await supabase
          .from("personal_snapshot_v2")
          .select("date, total_leads, total_responses, response_tags, stage_tags, final_tag_count")
          .eq("user_id", member.user_id)
          .gte("date", args.start_date)
          .lte("date", args.end_date)
          .order("date", { ascending: true });
        
        const rows = data || [];
        const totalLeads = rows.reduce((s: number, r: any) => s + (r.total_leads || 0), 0);
        const totalResponses = rows.reduce((s: number, r: any) => s + (r.total_responses || 0), 0);
        const totalEnrollments = computeEnrollments(rows, labels);
        
        return JSON.stringify({
          member_name: member.display_name,
          period: `${args.start_date} to ${args.end_date}`,
          days_tracked: rows.length,
          total_leads: totalLeads,
          total_responses: totalResponses,
          total_enrollments: totalEnrollments,
        });
      }

      case "get_rankings": {
        if (team.length === 0) return JSON.stringify({ error: "No team members found." });
        
        const memberIds = team.map(m => m.user_id);
        const { data } = await supabase
          .from("personal_snapshot_v2")
          .select("user_id, total_leads, total_responses, response_tags")
          .in("user_id", memberIds)
          .gte("date", args.start_date)
          .lte("date", args.end_date);
        
        const rows = data || [];
        const memberAgg: Record<string, { name: string; leads: number; responses: number; enrollments: number }> = {};
        for (const m of team) {
          memberAgg[m.user_id] = { name: m.display_name, leads: 0, responses: 0, enrollments: 0 };
        }
        for (const r of rows) {
          const m = memberAgg[r.user_id];
          if (m) {
            m.leads += r.total_leads || 0;
            m.responses += r.total_responses || 0;
            if (labels.enrollmentSlotKey && r.response_tags && typeof r.response_tags === "object") {
              m.enrollments += (typeof r.response_tags[labels.enrollmentSlotKey] === "number" ? r.response_tags[labels.enrollmentSlotKey] : 0);
            }
          }
        }
        
        const list = Object.values(memberAgg);
        const metricKey = args.metric === "enrollments" ? "enrollments" : args.metric === "total_responses" ? "responses" : "leads";
        list.sort((a: any, b: any) => args.order === "top" ? b[metricKey] - a[metricKey] : a[metricKey] - b[metricKey]);
        
        return JSON.stringify({
          metric: args.metric,
          order: args.order,
          period: `${args.start_date} to ${args.end_date}`,
          rankings: list.map((m, i) => ({ rank: i + 1, name: m.name, [metricKey]: (m as any)[metricKey] })),
        });
      }

      case "search_prospects": {
        let query = supabase
          .from("prospects")
          .select("name, phone, status, response_tag, stage_tag, notes, created_at")
          .eq("user_id", userId)
          .is("deleted_at", null)
          .limit(args.limit || 10);
        
        if (args.query) query = query.ilike("name", `%${args.query}%`);
        if (args.status) query = query.eq("status", args.status);
        
        const { data } = await query.order("created_at", { ascending: false });
        return JSON.stringify({ results: data || [], count: (data || []).length });
      }

      case "get_prospect_details": {
        const { data } = await supabase
          .from("prospects")
          .select("name, phone, status, response_tag, stage_tag, notes, source, created_at, updated_at")
          .eq("user_id", userId)
          .ilike("name", `%${args.name}%`)
          .is("deleted_at", null)
          .limit(5);
        
        return JSON.stringify({ matches: data || [] });
      }

      case "get_funnel_stages": {
        const table = snapshotTable(args.source);
        const { data } = await supabase
          .from(table)
          .select("stage_tags, response_tags, total_leads, final_tag_count")
          .eq("user_id", userId)
          .gte("date", args.start_date)
          .lte("date", args.end_date);
        
        const rows = data || [];
        const rawStageTags: Record<string, number> = {};
        const totalLeads = rows.reduce((s: number, r: any) => s + (r.total_leads || 0), 0);
        const totalEnrollments = computeEnrollments(rows, labels);
        
        for (const r of rows) {
          if (r.stage_tags && typeof r.stage_tags === "object") {
            for (const [k, v] of Object.entries(r.stage_tags)) {
              rawStageTags[k] = (rawStageTags[k] || 0) + (typeof v === "number" ? v : 0);
            }
          }
        }
        
        const stageTags = resolveTagNames(rawStageTags, labels.stageLabels, "stage_tag");
        
        return JSON.stringify({
          source: table,
          period: `${args.start_date} to ${args.end_date}`,
          total_leads: totalLeads,
          stages: stageTags,
          total_enrollments: totalEnrollments,
        });
      }

      case "get_conversion_rates": {
        const table = snapshotTable(args.source);
        const { data } = await supabase
          .from(table)
          .select("stage_tags, total_leads, response_tags, final_tag_count")
          .eq("user_id", userId)
          .gte("date", args.start_date)
          .lte("date", args.end_date);
        
        const rows = data || [];
        const rawStageTags: Record<string, number> = {};
        const totalLeads = rows.reduce((s: number, r: any) => s + (r.total_leads || 0), 0);
        
        for (const r of rows) {
          if (r.stage_tags && typeof r.stage_tags === "object") {
            for (const [k, v] of Object.entries(r.stage_tags)) {
              rawStageTags[k] = (rawStageTags[k] || 0) + (typeof v === "number" ? v : 0);
            }
          }
        }
        
        const stageTags = resolveTagNames(rawStageTags, labels.stageLabels, "stage_tag");
        const stageEntries = Object.entries(stageTags).sort((a, b) => {
          const numA = parseInt(a[0].replace(/\D/g, "")) || 0;
          const numB = parseInt(b[0].replace(/\D/g, "")) || 0;
          return numA - numB;
        });
        
        const conversions: { from: string; to: string; rate: string; drop: number }[] = [];
        let prev = { name: "Total Leads", count: totalLeads };
        for (const [name, count] of stageEntries) {
          conversions.push({
            from: prev.name,
            to: name,
            rate: prev.count > 0 ? `${((count / prev.count) * 100).toFixed(1)}%` : "N/A",
            drop: prev.count - count,
          });
          prev = { name, count };
        }
        
        return JSON.stringify({ source: table, period: `${args.start_date} to ${args.end_date}`, total_leads: totalLeads, conversions });
      }

      case "get_tracking_status": {
        const today = todayStr();
        // Check total first, fall back to personal
        let todayData: any = null;
        const { data: totalToday } = await supabase
          .from("total_snapshot_v2")
          .select("total_leads, total_responses, response_tags, stage_tags, funnel_day, final_tag, final_tag_count")
          .eq("user_id", userId)
          .eq("date", today)
          .maybeSingle();
        
        if (totalToday) {
          todayData = totalToday;
        } else {
          const { data: personalToday } = await supabase
            .from("personal_snapshot_v2")
            .select("total_leads, total_responses, response_tags, stage_tags, funnel_day, final_tag, final_tag_count")
            .eq("user_id", userId)
            .eq("date", today)
            .maybeSingle();
          todayData = personalToday;
        }
        
        const { data: recentLogs } = await supabase
          .from("daily_tracking_logs")
          .select("log_date")
          .eq("user_id", userId)
          .order("log_date", { ascending: false })
          .limit(30);
        
        let streak = 0;
        if (recentLogs && recentLogs.length > 0) {
          const dates = recentLogs.map((r: any) => r.log_date).sort().reverse();
          const d = new Date(today);
          for (const logDate of dates) {
            const expected = d.toISOString().split("T")[0];
            if (logDate === expected) {
              streak++;
              d.setDate(d.getDate() - 1);
            } else {
              break;
            }
          }
        }
        
        const result: any = {
          today: today,
          tracked_today: !!todayData,
          streak_days: streak,
        };
        
        if (todayData) {
          const rTags = resolveTagNames(todayData.response_tags || {}, labels.responseLabels, "response_tag");
          const sTags = resolveTagNames(todayData.stage_tags || {}, labels.stageLabels, "stage_tag");
          const enrollToday = labels.enrollmentSlotKey && todayData.response_tags
            ? (typeof todayData.response_tags[labels.enrollmentSlotKey] === "number" ? todayData.response_tags[labels.enrollmentSlotKey] : 0)
            : (todayData.final_tag_count || 0);
          result.today_stats = {
            leads: todayData.total_leads || 0,
            responses: todayData.total_responses || 0,
            enrollments: enrollToday,
            funnel_day: todayData.funnel_day,
            response_breakdown: rTags,
            stage_breakdown: sTags,
          };
        }
        
        return JSON.stringify(result);
      }

      default:
        return JSON.stringify({ error: `Unknown tool: ${name}` });
    }
  } catch (e) {
    console.error(`Tool ${name} error:`, e);
    return JSON.stringify({ error: `Tool execution failed: ${e instanceof Error ? e.message : "unknown"}` });
  }
}

// ══════════════════════════════════════════════════════════════
// SYSTEM PROMPT
// ══════════════════════════════════════════════════════════════
function buildSystemPrompt(role: string, teamSize: number, displayName: string): string {
  return `You are NevorAI Assistant — a precise, data-driven AI for network marketers using the NevorAI CRM.

DOMAIN DEFINITIONS:
- Enrollment = the response tag marked as the enrollment/final target (summed from response_tags)
- Prospect = any lead not yet at the final stage
- Leads = total_leads (new names added)
- Responses = total_responses (prospects who replied)
- Conversion rate = enrollments / total_leads

DATA SOURCE RULES:
- By default, use source="total" for get_snapshot_kpis, get_funnel_stages, get_conversion_rates. This matches the dashboard's "Total" view and includes team+personal combined data.
- Only use source="personal" when the user EXPLICITLY asks for "my personal data only" or "personal stats".

USER: ${displayName}
ROLE: ${role.toUpperCase()}${role === "leader" ? ` with ${teamSize} direct team members` : " (individual, no team access)"}

CURRENT DATE: ${todayStr()}
CURRENT MONTH: ${monthYearNow()}

CRITICAL RULES:
1. ONLY reference numbers from tool results. Never estimate or guess.
2. If data is missing, say "I don't have that information."
3. Never reveal raw JSON, table names, column names, or internal identifiers.
4. Use human-readable tag names (from tool results), never slot keys like "response_tag_1".
5. This is READ-ONLY. Never suggest users can update data via chat.
6. ${role === "member" ? "Do NOT reference team features — this user has no team." : "You can access team data for this leader."}

FORMATTING:
- Brief responses: 2-4 sentences for simple questions, short paragraph for analysis.
- Use markdown tables for comparisons with 3+ rows.
- 1-2 emoji max per response.
- Format numbers clearly (e.g. "45 leads", "12.5% conversion").
- Be encouraging but honest about low numbers.
- Give specific, actionable advice.
- Respond in the same language the user writes in.

Use the provided tools to fetch data before answering. Always call at least one tool for data questions.`;
}

// ══════════════════════════════════════════════════════════════
// MAIN HANDLER
// ══════════════════════════════════════════════════════════════
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { messages, auth_token } = body;

    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: "messages array required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Auth via auth_token in body ──
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const token = auth_token || req.headers.get("Authorization")?.replace("Bearer ", "");
    
    if (!token) {
      return new Response(JSON.stringify({ error: "Unauthorized — no auth token" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized — invalid token" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Rate limit ──
    if (!checkRateLimit(user.id)) {
      return new Response(JSON.stringify({ error: "Rate limit reached. Please wait a moment." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI service not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Resolve context ──
    const [team, labels, profileData] = await Promise.all([
      discoverTeam(supabase, user.id),
      resolveLabels(supabase, user.id),
      supabase.from("profiles").select("display_name").eq("user_id", user.id).maybeSingle(),
    ]);

    const displayName = profileData.data?.display_name || "User";
    const role = team.length > 0 ? "leader" : "member";
    console.log(`User: ${displayName}, Role: ${role}, Team: ${team.length}, Labels: R=${labels.responseLabels.length} S=${labels.stageLabels.length}`);

    // ── Tool-calling loop ──
    const systemPrompt = buildSystemPrompt(role, team.length, displayName);
    let conversationMessages: any[] = [
      { role: "system", content: systemPrompt },
      ...messages.slice(-6), // Keep last 6 messages for context
    ];

    let finalResponse = "";

    for (let iteration = 0; iteration < MAX_TOOL_ITERATIONS; iteration++) {
      const aiResp = await fetch(AI_GATEWAY, {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: MODEL,
          messages: conversationMessages,
          tools: TOOLS,
          tool_choice: iteration === 0 ? "auto" : "auto",
        }),
      });

      if (!aiResp.ok) {
        const status = aiResp.status;
        if (status === 429) {
          return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
            status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (status === 402) {
          return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits." }), {
            status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        console.error("AI gateway error:", status, await aiResp.text());
        return new Response(JSON.stringify({ error: "AI service error" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const aiData = await aiResp.json();
      const choice = aiData.choices?.[0];
      if (!choice) {
        finalResponse = "I couldn't process your request. Please try again.";
        break;
      }

      const msg = choice.message;
      conversationMessages.push(msg);

      // If the model wants to call tools
      if (msg.tool_calls && msg.tool_calls.length > 0) {
        console.log(`Iteration ${iteration + 1}: ${msg.tool_calls.length} tool call(s)`);
        
        for (const toolCall of msg.tool_calls) {
          const fnName = toolCall.function.name;
          let fnArgs: any = {};
          try {
            fnArgs = JSON.parse(toolCall.function.arguments || "{}");
          } catch {
            fnArgs = {};
          }
          
          console.log(`  Tool: ${fnName}`, JSON.stringify(fnArgs));
          const result = await executeTool(fnName, fnArgs, supabase, user.id, team, labels);
          
          conversationMessages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: result,
          });
        }
        // Continue loop for next iteration
        continue;
      }

      // Model gave a final text response
      finalResponse = msg.content || "I couldn't generate a response.";
      break;
    }

    return new Response(JSON.stringify({ response: finalResponse, scope: role }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("nevorai-ai error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
