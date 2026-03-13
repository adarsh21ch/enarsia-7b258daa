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
    // Format 1: simple array of strings
    return raw.filter((x: any) => typeof x === "string");
  }
  // Format 2: { tracking: [{ name, isStageTag, isFinalTarget }] }
  //        or { stages: [{ name, isFinalTarget }] }
  if (raw.tracking && Array.isArray(raw.tracking)) {
    return raw.tracking.map((t: any) => t.name).filter(Boolean);
  }
  if (raw.stages && Array.isArray(raw.stages)) {
    return raw.stages.map((t: any) => t.name).filter(Boolean);
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

/**
 * Normalize a tags object (which may have slot keys, human names, or both)
 * into a canonical slot-key form: { response_tag_1: N, response_tag_2: N, ... }
 */
function coerceToSlots(
  tags: Record<string, number>,
  labelCount: number,
  ownerLabels: string[] | undefined,
  slotPrefix: string,
  rootLabels?: string[]
): Record<string, number> {
  const result: Record<string, number> = {};
  for (let i = 1; i <= labelCount; i++) {
    result[`${slotPrefix}${i}`] = 0;
  }

  // Pass 1: Extract slot keys (authoritative)
  const positionsWithSlotKeys = new Set<number>();
  for (const [key, count] of Object.entries(tags)) {
    const match = key.match(new RegExp(`^${slotPrefix}(\\d+)$`));
    if (match) {
      const pos = parseInt(match[1], 10);
      if (pos >= 1 && pos <= labelCount) {
        result[key] = (result[key] || 0) + (count || 0);
        positionsWithSlotKeys.add(pos);
      }
    }
  }

  // Pass 2: Fill missing positions from legacy human-readable labels
  for (const [key, count] of Object.entries(tags)) {
    if (key.startsWith(slotPrefix)) continue;
    let pos = -1;
    if (ownerLabels?.length) {
      pos = ownerLabels.findIndex(l => l?.toLowerCase() === key.toLowerCase());
    }
    if (pos === -1 && rootLabels?.length) {
      pos = rootLabels.findIndex(l => l?.toLowerCase() === key.toLowerCase());
    }
    if (pos !== -1 && pos < labelCount) {
      const slotKey = `${slotPrefix}${pos + 1}`;
      if (!positionsWithSlotKeys.has(pos + 1) || result[slotKey] === 0) {
        result[slotKey] = (result[slotKey] || 0) + (count || 0);
      }
    }
  }
  return result;
}

/**
 * Convert slot-keyed values back to human-readable label names.
 */
function slotsToLabels(
  slotValues: Record<string, number>,
  labels: string[],
  slotPrefix: string
): Record<string, number> {
  const result: Record<string, number> = {};
  labels.forEach((label, i) => {
    result[label] = slotValues[`${slotPrefix}${i + 1}`] || 0;
  });
  return result;
}

// ══════════════════════════════════════════════════════════════
// TEAM DISCOVERY — dual filter matching dashboard logic
// ══════════════════════════════════════════════════════════════
interface TeamMember {
  user_id: string;
  display_name: string;
  level_id: string | null;
  level_label: string | null;
  level_code: string | null;
  level_position: number | null;
}

interface LeaderLevel {
  id: string;
  label: string;
  code: string | null;
  position: number;
}

async function fetchLeaderLevels(supabase: any, userId: string): Promise<LeaderLevel[]> {
  const { data } = await supabase
    .from("leader_levels")
    .select("id, label, code, position")
    .eq("leader_id", userId)
    .order("position", { ascending: true });
  return (data || []) as LeaderLevel[];
}

async function discoverTeam(supabase: any, userId: string, levels: LeaderLevel[]): Promise<TeamMember[]> {
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
  const queries: Promise<any>[] = [];

  if (leaderEmail) {
    queries.push(
      supabase
        .from("profiles")
        .select("user_id, display_name, level_id")
        .eq("upline_email", leaderEmail)
        .eq("allow_leader_to_view", true)
    );
  }

  if (leaderId) {
    queries.push(
      supabase
        .from("profiles")
        .select("user_id, display_name, level_id")
        .eq("leaders_id_of_my_leader", leaderId)
        .eq("allow_leader_to_view", true)
    );
  }

  const results = await Promise.all(queries);
  const memberMap = new Map<string, { display_name: string; level_id: string | null }>();
  
  for (const result of results) {
    const data = result.data || [];
    for (const m of data) {
      if (m.user_id !== userId) {
        memberMap.set(m.user_id, { display_name: m.display_name || "Unknown", level_id: m.level_id || null });
      }
    }
  }

  // Build level lookup map
  const levelMap = new Map(levels.map(l => [l.id, l]));

  return Array.from(memberMap.entries()).map(([user_id, info]) => {
    const level = info.level_id ? levelMap.get(info.level_id) : null;
    return {
      user_id,
      display_name: info.display_name,
      level_id: info.level_id,
      level_label: level?.label || null,
      level_code: level?.code || null,
      level_position: level?.position || null,
    };
  });
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
  {
    type: "function",
    function: {
      name: "filter_team_by_level",
      description: "Filter team members by their assigned level (e.g. AS, S, AM, M). Use when user asks about specific level groups. Returns members and their KPIs.",
      parameters: {
        type: "object",
        properties: {
          level_name: { type: "string", description: "Level label or code to filter by (e.g. 'S', 'AM', 'M', 'AS')" },
          start_date: { type: "string", description: "YYYY-MM-DD start of date range for KPIs" },
          end_date: { type: "string", description: "YYYY-MM-DD end of date range for KPIs" },
        },
        required: ["level_name", "start_date", "end_date"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_team_tracking_status",
      description: "Get which team members have or haven't updated their tracking today (leaders only). Use for 'who hasn't updated today' queries.",
      parameters: { type: "object", properties: {}, additionalProperties: false },
    },
  },
  {
    type: "function",
    function: {
      name: "get_stale_prospects",
      description: "Find prospects stuck in a funnel stage for too long without activity",
      parameters: {
        type: "object",
        properties: {
          days_stale: { type: "number", description: "Number of days without activity to consider stale (default 7)" },
          limit: { type: "number", description: "Max results (default 15)" },
        },
        required: [],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_activity_trend",
      description: "Compare recent 7-day activity vs prior 7 days to detect drops or improvements",
      parameters: { type: "object", properties: {}, additionalProperties: false },
    },
  },
  {
    type: "function",
    function: {
      name: "get_daily_snapshot_summary",
      description: "Generate a comprehensive daily business snapshot including leads, responses, enrollments, team status, and streak",
      parameters: { type: "object", properties: {}, additionalProperties: false },
    },
  },
  {
    type: "function",
    function: {
      name: "get_funnel_analysis",
      description: "Analyze funnel configuration and stage distribution with drop-off detection and suggestions",
      parameters: { type: "object", properties: {}, additionalProperties: false },
    },
  },
  {
    type: "function",
    function: {
      name: "get_coaching_tips",
      description: "Analyze recent activity trends and provide actionable coaching suggestions based on data",
      parameters: { type: "object", properties: {}, additionalProperties: false },
    },
  },
];

// Helper: compute enrollments from response_tags using enrollmentSlotKey
function computeEnrollments(rows: any[], labels: LabelMap): number {
  if (labels.enrollmentSlotKey) {
    // Accumulate raw response_tags across all rows first
    const rawTags: Record<string, number> = {};
    for (const r of rows) {
      if (r.response_tags && typeof r.response_tags === "object") {
        for (const [k, v] of Object.entries(r.response_tags)) {
          rawTags[k] = (rawTags[k] || 0) + (typeof v === "number" ? v : 0);
        }
      }
    }
    // Coerce once, then read the enrollment slot
    const slots = coerceToSlots(rawTags, labels.responseLabels.length, labels.responseLabels, "response_tag_", labels.responseLabels);
    return slots[labels.enrollmentSlotKey] || 0;
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
        
        // Accumulate ALL tag keys (both slot and legacy) across rows
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
        
        // CRITICAL: Apply coerceToSlots then slotsToLabels
        const responseSlots = coerceToSlots(rawResponseTags, labels.responseLabels.length, labels.responseLabels, "response_tag_", labels.responseLabels);
        const responseTags = slotsToLabels(responseSlots, labels.responseLabels, "response_tag_");
        const stageSlots = coerceToSlots(rawStageTags, labels.stageLabels.length, labels.stageLabels, "stage_tag_", labels.stageLabels);
        const stageTags = slotsToLabels(stageSlots, labels.stageLabels, "stage_tag_");
        
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
          .from("total_snapshot_v2")
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
          members: team.map(m => ({
            name: m.display_name,
            level: m.level_label || "Unassigned",
            level_code: m.level_code || null,
          })),
        });
      }

      case "get_member_kpis": {
        const member = team.find(m => m.display_name.toLowerCase().includes(args.member_name.toLowerCase()));
        if (!member) return JSON.stringify({ error: `Member "${args.member_name}" not found in your team.` });
        
        const { data } = await supabase
          .from("total_snapshot_v2")
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
          .from("total_snapshot_v2")
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
        
        const stageSlots = coerceToSlots(rawStageTags, labels.stageLabels.length, labels.stageLabels, "stage_tag_", labels.stageLabels);
        const stageTags = slotsToLabels(stageSlots, labels.stageLabels, "stage_tag_");
        
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
        
        const stageSlots = coerceToSlots(rawStageTags, labels.stageLabels.length, labels.stageLabels, "stage_tag_", labels.stageLabels);
        const stageTags = slotsToLabels(stageSlots, labels.stageLabels, "stage_tag_");
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
          const rSlots = coerceToSlots(todayData.response_tags || {}, labels.responseLabels.length, labels.responseLabels, "response_tag_");
          const rTags = slotsToLabels(rSlots, labels.responseLabels, "response_tag_");
          const sSlots = coerceToSlots(todayData.stage_tags || {}, labels.stageLabels.length, labels.stageLabels, "stage_tag_");
          const sTags = slotsToLabels(sSlots, labels.stageLabels, "stage_tag_");
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

      case "filter_team_by_level": {
        if (team.length === 0) return JSON.stringify({ error: "No team members found." });
        
        const levelName = args.level_name;
        // Match by label or code, case-insensitive
        const matchedMembers = team.filter(m =>
          m.level_label?.toLowerCase() === levelName.toLowerCase() ||
          m.level_code?.toLowerCase() === levelName.toLowerCase()
        );
        
        if (matchedMembers.length === 0) {
          const availableLevels = [...new Set(team.map(m => m.level_label).filter(Boolean))];
          return JSON.stringify({
            error: `No members found at level "${levelName}". Available levels: ${availableLevels.join(", ") || "None assigned"}`,
          });
        }
        
        // Fetch KPIs for matched members
        const filteredIds = matchedMembers.map(m => m.user_id);
        const { data: levelSnapshots } = await supabase
          .from("total_snapshot_v2")
          .select("user_id, total_leads, total_responses, response_tags")
          .in("user_id", filteredIds)
          .gte("date", args.start_date)
          .lte("date", args.end_date);
        
        const levelRows = levelSnapshots || [];
        const levelAgg: Record<string, { name: string; leads: number; responses: number; enrollments: number }> = {};
        for (const m of matchedMembers) {
          levelAgg[m.user_id] = { name: m.display_name, leads: 0, responses: 0, enrollments: 0 };
        }
        for (const r of levelRows) {
          const m = levelAgg[r.user_id];
          if (m) {
            m.leads += r.total_leads || 0;
            m.responses += r.total_responses || 0;
            if (labels.enrollmentSlotKey && r.response_tags && typeof r.response_tags === "object") {
              m.enrollments += (typeof r.response_tags[labels.enrollmentSlotKey] === "number" ? r.response_tags[labels.enrollmentSlotKey] : 0);
            }
          }
        }
        
        const levelMembers = Object.values(levelAgg);
        return JSON.stringify({
          level: levelName,
          period: `${args.start_date} to ${args.end_date}`,
          member_count: matchedMembers.length,
          grand_total_leads: levelMembers.reduce((s, m) => s + m.leads, 0),
          grand_total_responses: levelMembers.reduce((s, m) => s + m.responses, 0),
          grand_total_enrollments: levelMembers.reduce((s, m) => s + m.enrollments, 0),
          per_member: levelMembers,
        });
      }

      case "get_team_tracking_status": {
        if (team.length === 0) return JSON.stringify({ error: "No team members found." });
        const today = todayStr();
        const memberIds = team.map(m => m.user_id);
        
        const { data: todaySnapshots } = await supabase
          .from("total_snapshot_v2")
          .select("user_id")
          .in("user_id", memberIds)
          .eq("date", today);
        
        const updatedSet = new Set((todaySnapshots || []).map((r: any) => r.user_id));
        const updated = team.filter(m => updatedSet.has(m.user_id));
        const notUpdated = team.filter(m => !updatedSet.has(m.user_id));
        
        return JSON.stringify({
          date: today,
          team_size: team.length,
          updated_count: updated.length,
          not_updated_count: notUpdated.length,
          updated: updated.map(m => m.display_name),
          not_updated: notUpdated.slice(0, 20).map(m => m.display_name),
          has_more: notUpdated.length > 20,
        });
      }

      case "get_stale_prospects": {
        const daysStale = args.days_stale || 7;
        const limit = args.limit || 15;
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysStale);
        const cutoff = cutoffDate.toISOString();
        
        const { data } = await supabase
          .from("prospects")
          .select("name, funnel_stage, action_taken, prospect_status, updated_at")
          .eq("user_id", userId)
          .is("deleted_at", null)
          .lt("updated_at", cutoff)
          .not("prospect_status", "eq", "not_interested")
          .order("updated_at", { ascending: true })
          .limit(limit);
        
        return JSON.stringify({
          stale_days: daysStale,
          count: (data || []).length,
          prospects: (data || []).map((p: any) => ({
            name: p.name,
            stage: p.funnel_stage || "N/A",
            status: p.prospect_status || "N/A",
            last_activity: p.updated_at?.split("T")[0] || "Unknown",
          })),
        });
      }

      case "get_activity_trend": {
        const today = new Date();
        const d7 = new Date(today); d7.setDate(d7.getDate() - 7);
        const d14 = new Date(today); d14.setDate(d14.getDate() - 14);
        
        const [{ data: recent }, { data: prior }] = await Promise.all([
          supabase.from("total_snapshot_v2")
            .select("total_leads, total_responses, final_tag_count")
            .eq("user_id", userId)
            .gte("date", d7.toISOString().split("T")[0])
            .lte("date", todayStr()),
          supabase.from("total_snapshot_v2")
            .select("total_leads, total_responses, final_tag_count")
            .eq("user_id", userId)
            .gte("date", d14.toISOString().split("T")[0])
            .lt("date", d7.toISOString().split("T")[0]),
        ]);
        
        const sumField = (rows: any[], field: string) => (rows || []).reduce((s: number, r: any) => s + (r[field] || 0), 0);
        const recentLeads = sumField(recent, "total_leads");
        const priorLeads = sumField(prior, "total_leads");
        const recentResponses = sumField(recent, "total_responses");
        const priorResponses = sumField(prior, "total_responses");
        
        const pctChange = (curr: number, prev: number) => prev === 0 ? (curr > 0 ? "+100%" : "0%") : `${curr >= prev ? "+" : ""}${(((curr - prev) / prev) * 100).toFixed(0)}%`;
        
        return JSON.stringify({
          recent_7_days: { leads: recentLeads, responses: recentResponses, days_tracked: (recent || []).length },
          prior_7_days: { leads: priorLeads, responses: priorResponses, days_tracked: (prior || []).length },
          leads_change: pctChange(recentLeads, priorLeads),
          responses_change: pctChange(recentResponses, priorResponses),
          trend: recentLeads >= priorLeads ? "improving" : "declining",
        });
      }

      case "get_daily_snapshot_summary": {
        const today = todayStr();
        const { data: todayData } = await supabase
          .from("total_snapshot_v2")
          .select("total_leads, total_responses, response_tags, stage_tags, funnel_day, final_tag_count")
          .eq("user_id", userId)
          .eq("date", today)
          .maybeSingle();
        
        let teamStatus = null;
        if (team.length > 0) {
          const memberIds = team.map(m => m.user_id);
          const { data: teamToday } = await supabase
            .from("total_snapshot_v2")
            .select("user_id")
            .in("user_id", memberIds)
            .eq("date", today);
          teamStatus = {
            team_size: team.length,
            updated_today: (teamToday || []).length,
            pending: team.length - (teamToday || []).length,
          };
        }
        
        const result: any = { date: today };
        if (todayData) {
          const rSlots = coerceToSlots(todayData.response_tags || {}, labels.responseLabels.length, labels.responseLabels, "response_tag_");
          const rTags = slotsToLabels(rSlots, labels.responseLabels, "response_tag_");
          result.leads = todayData.total_leads || 0;
          result.responses = todayData.total_responses || 0;
          result.enrollments = computeEnrollments([todayData], labels);
          result.funnel_day = todayData.funnel_day;
          result.response_breakdown = rTags;
        } else {
          result.leads = 0;
          result.responses = 0;
          result.enrollments = 0;
          result.not_tracked_yet = true;
        }
        if (teamStatus) result.team_status = teamStatus;
        
        return JSON.stringify(result);
      }

      case "get_funnel_analysis": {
        // Get funnel config
        const { data: funnelConfig } = await supabase
          .from("funnel_configs")
          .select("funnel_name, funnel_length, day_1_start")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        
        // Get last 30 days stage data
        const d30 = new Date(); d30.setDate(d30.getDate() - 30);
        const { data: stageData } = await supabase
          .from("total_snapshot_v2")
          .select("date, stage_tags, total_leads, funnel_day")
          .eq("user_id", userId)
          .gte("date", d30.toISOString().split("T")[0])
          .order("date", { ascending: true });
        
        const rows = stageData || [];
        const rawStageTags: Record<string, number> = {};
        const totalLeads = rows.reduce((s: number, r: any) => s + (r.total_leads || 0), 0);
        
        for (const r of rows) {
          if (r.stage_tags && typeof r.stage_tags === "object") {
            for (const [k, v] of Object.entries(r.stage_tags)) {
              rawStageTags[k] = (rawStageTags[k] || 0) + (typeof v === "number" ? v : 0);
            }
          }
        }
        
        const stageSlots = coerceToSlots(rawStageTags, labels.stageLabels.length, labels.stageLabels, "stage_tag_", labels.stageLabels);
        const stageTags = slotsToLabels(stageSlots, labels.stageLabels, "stage_tag_");
        
        // Calculate drop-offs
        const stageEntries = Object.entries(stageTags);
        const dropOffs: any[] = [];
        for (let i = 1; i < stageEntries.length; i++) {
          const prev = stageEntries[i - 1];
          const curr = stageEntries[i];
          if (prev[1] > 0) {
            dropOffs.push({
              from: prev[0],
              to: curr[0],
              drop_rate: `${(((prev[1] - curr[1]) / prev[1]) * 100).toFixed(0)}%`,
              lost: prev[1] - curr[1],
            });
          }
        }
        
        return JSON.stringify({
          funnel_config: funnelConfig || null,
          period: "Last 30 days",
          total_leads: totalLeads,
          stage_distribution: stageTags,
          drop_offs: dropOffs,
          current_funnel_day: rows.length > 0 ? rows[rows.length - 1].funnel_day : null,
        });
      }

      case "get_coaching_tips": {
        // Gather recent data for coaching
        const today = new Date();
        const d7 = new Date(today); d7.setDate(d7.getDate() - 7);
        
        const { data: weekData } = await supabase
          .from("total_snapshot_v2")
          .select("total_leads, total_responses, response_tags, final_tag_count")
          .eq("user_id", userId)
          .gte("date", d7.toISOString().split("T")[0])
          .lte("date", todayStr());
        
        const rows = weekData || [];
        const leads = rows.reduce((s: number, r: any) => s + (r.total_leads || 0), 0);
        const responses = rows.reduce((s: number, r: any) => s + (r.total_responses || 0), 0);
        const enrollments = computeEnrollments(rows, labels);
        const daysTracked = rows.length;
        
        // Get stale prospects count
        const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 5);
        const { count: staleCount } = await supabase
          .from("prospects")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId)
          .is("deleted_at", null)
          .lt("updated_at", cutoff.toISOString())
          .not("prospect_status", "eq", "not_interested");
        
        return JSON.stringify({
          week_summary: { leads, responses, enrollments, days_tracked: daysTracked },
          response_rate: leads > 0 ? `${((responses / leads) * 100).toFixed(0)}%` : "N/A",
          conversion_rate: leads > 0 ? `${((enrollments / leads) * 100).toFixed(0)}%` : "N/A",
          stale_prospects: staleCount || 0,
          consistency: daysTracked >= 6 ? "excellent" : daysTracked >= 4 ? "good" : "needs_improvement",
        });
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
function buildSystemPrompt(role: string, teamSize: number, displayName: string, levels: LeaderLevel[]): string {
  const levelInfo = levels.length > 0
    ? `\nTEAM LEVELS (from highest position to lowest): ${levels.map(l => `${l.label}${l.code ? ` (${l.code})` : ""}`).join(", ")}\n- You can filter team data by level when users ask about specific groups (e.g. "show me all S members", "AM team performance").`
    : "";
  return `You are Nevorai AI — a PROACTIVE DATA-FIRST business coach for network marketers using TrackUp.
Your job is to show NUMBERS clearly, fast, and accurately — AND proactively coach users to improve.

You are not just a Q&A bot. You are a business coach who:
- Analyzes patterns and trends in data
- Detects problems (stale prospects, activity drops, team gaps)
- Provides actionable coaching suggestions
- Celebrates wins and improvements

════════════════════════════════════
CORE RESPONSE RULES
════════════════════════════════════
1. ALWAYS show the MAIN NUMBER first.
2. Keep answers SHORT, CRISP, and STRUCTURED.
3. Prefer BULLETS, TABLES, or NUMBERED LISTS.
4. Use headings like: Summary, Breakdown, Team Status.
5. Emojis are allowed ONLY for clarity (📊 📈 ⛔).

════════════════════════════════════
STRICT DONTs
════════════════════════════════════
❌ Never guess or estimate
❌ Never say "it seems", "might be", "based on profile"
❌ Never explain what a metric means
❌ Never write long paragraphs
❌ Never hide numbers inside sentences
If data is missing, say EXACTLY: "No tracking data found for this period."

════════════════════════════════════
FORMAT STANDARDS
════════════════════════════════════
For SINGLE NUMBER:
Total Day 1: 109 (Team, Yesterday)

For BREAKDOWN:
Day 1 Breakdown (Team, Feb 09):
1. Raj – 16
2. Priya – 14
3. Mohit – 12

For STATUS CHECK:
❌ Not Updated Yesterday (36 members):
1. Sami Ali
2. Mohit Shakya
3. Sonu Singh
… (show max 15, then say "+ more")

For TEAM SIZE:
👥 Total Team Members: 44
• Updated yesterday: 8
• Not updated: 36

════════════════════════════════════
FOLLOW-UP INTELLIGENCE
════════════════════════════════════
If user asks:
• "team" → use team scope
• "yesterday" → use that date
• "total" → use total_snapshot_v2
• name-based query → resolve member first, then answer
Spelling mistakes are OK. Intent matters, not grammar.

════════════════════════════════════
FINAL RULE
════════════════════════════════════
Numbers > Formatting > Explanation
If forced to choose — DROP explanation.

════════════════════════════════════
DOMAIN DEFINITIONS
════════════════════════════════════
- Enrollment = the response tag marked as the enrollment/final target (summed from response_tags)
- Prospect = any lead not yet at the final stage
- Leads = total_leads (new names added)
- Responses = total_responses (prospects who replied)
- Conversion rate = enrollments / total_leads

DATA SOURCE RULES:
- By default, use source="total" for get_snapshot_kpis, get_funnel_stages, get_conversion_rates. This matches the dashboard's "Total" view.
- Only use source="personal" when the user EXPLICITLY asks for "my personal data only".

USER: ${displayName}
ROLE: ${role.toUpperCase()}${role === "leader" ? ` with ${teamSize} direct team members` : " (individual, no team access)"}${levelInfo}
CURRENT DATE: ${todayStr()}
CURRENT MONTH: ${monthYearNow()}

TECHNICAL RULES:
1. ONLY reference numbers from tool results. Never estimate or guess.
2. Never reveal raw JSON, table names, column names, or internal identifiers.
3. Use human-readable tag names (from tool results), never slot keys like "response_tag_1".
4. This is READ-ONLY. Never suggest users can update data via chat.
5. ${role === "member" ? "Do NOT reference team features — this user has no team." : "You can access team data for this leader."}
6. Respond in the same language the user writes in.

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
    const [levels, labels, profileData] = await Promise.all([
      fetchLeaderLevels(supabase, user.id),
      resolveLabels(supabase, user.id),
      supabase.from("profiles").select("display_name").eq("user_id", user.id).maybeSingle(),
    ]);

    const team = await discoverTeam(supabase, user.id, levels);

    const displayName = profileData.data?.display_name || "User";
    const role = team.length > 0 ? "leader" : "member";
    console.log(`User: ${displayName}, Role: ${role}, Team: ${team.length}, Levels: ${levels.length}, Labels: R=${labels.responseLabels.length} S=${labels.stageLabels.length}`);

    // ── Tool-calling loop ──
    const systemPrompt = buildSystemPrompt(role, team.length, displayName, levels);
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
