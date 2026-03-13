

# Upgrade Nevorai AI — Advanced Dashboard Intelligence & Team Analytics

## Analysis of Current State

The edge function already has solid tooling:
- `get_member_kpis` — individual member stats (but **no tag breakdowns**)
- `get_team_kpis` — aggregated team KPIs
- `get_rankings` — top/bottom performers
- `filter_team_by_level` — level-wise filtering
- `get_funnel_stages` / `get_funnel_analysis` — funnel data
- `get_activity_trend` — 7-day comparison
- `get_coaching_tips` — coaching insights
- `get_team_tracking_status` — who hasn't updated
- `get_stale_prospects` — stuck prospects
- `get_conversion_rates` — conversion rates

## What's Missing (Gaps to Fill)

| Feature Requested | Status | Action |
|---|---|---|
| Individual member detailed analytics with tag breakdowns | Partial — no response/stage tags returned | Enhance `get_member_kpis` |
| Compare 2+ team members | Missing | New tool: `compare_members` |
| Level-wise team analysis | Exists but basic | Already good, enhance system prompt |
| Funnel stage per team member | Missing | New tool: `get_team_funnel_breakdown` |
| Historical per-member daily data | Missing | New tool: `get_member_daily_history` |
| Ratio/performance metrics | Missing as dedicated tool | New tool: `get_performance_ratios` |
| Combined filters (level + metric + date) | Missing | New tool: `query_team_filtered` |
| Smarter suggestion chips | Basic | Enhance frontend |

## Changes

### 1. Edge Function: `supabase/functions/nevorai-ai/index.ts`

**Enhance existing tool:**
- `get_member_kpis` — add full `response_breakdown` and `stage_breakdown` (same pattern as `get_snapshot_kpis`)

**Add 4 new tools:**

- **`compare_members`** — accepts `member_names` (array of 2+), `start_date`, `end_date`. Returns side-by-side KPIs with auto-generated comparison insight.

- **`get_team_funnel_breakdown`** — returns funnel stage counts per team member for a date range. Shows who has the most Day-2, Day-3 prospects, etc.

- **`get_member_daily_history`** — accepts `member_name`, `start_date`, `end_date`. Returns day-by-day leads/responses/enrollments for a specific member (useful for "show Rohit's last 7 days").

- **`get_performance_ratios`** — accepts `start_date`, `end_date`, optional `member_name`. Calculates lead-to-response ratio, response-to-enrollment ratio, and per-day averages. Works for both user's own data and individual team members.

**Enhance system prompt:**
- Add explicit instructions for comparison queries ("compare X and Y", "who performed better")
- Add ratio/conversion query patterns
- Add combined filter instructions
- Increase context window from 6 to 10 messages for multi-turn analytics conversations

### 2. Frontend: `src/components/ai/AIAssistantChat.tsx`

**Updated suggestion categories:**
- Add "Compare team members" to Team category
- Add "My conversion ratios" to My Numbers
- Add "Team funnel breakdown" to Prospects
- Add "Top performers this week" to Team

**Enhanced follow-up map:**
- After comparison responses → "Show daily breakdown", "Who improved more?"
- After funnel responses → "Team funnel breakdown", "Show stuck prospects"
- After ratio responses → "Compare with last week", "Show member ratios"

### No Database Changes
All new tools read from existing `total_snapshot_v2`, `personal_snapshot_v2`, `prospects`, `profiles`, `funnel_configs` tables.

## Implementation Order
1. Add 4 new tools to TOOLS array in edge function
2. Implement tool execution logic in `executeTool` switch
3. Enhance `get_member_kpis` with tag breakdowns
4. Update system prompt with new query patterns
5. Increase conversation context to 10 messages
6. Update frontend suggestion chips and follow-up map

