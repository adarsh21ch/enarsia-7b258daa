

## Rebuild AI Assistant: Backend-Driven, Intent-Based Architecture

### What Changes

Replace the current `ai-assistant` edge function (which dumps all user data into one system prompt) with a new `nevorai-ai` edge function that follows a strict 3-step pipeline:

```text
Step 1: DETECT INTENT
  User message --> AI classifies intent (tool calling)
  e.g. "How many enrollments this month?" --> intent: monthly_summary

Step 2: FETCH DATA (controlled queries)
  Based on intent, run ONLY the relevant predefined queries
  e.g. monthly_summary --> query personal_snapshot_v2 for the month

Step 3: EXPLAIN DATA
  Pass the clean JSON result to AI with strict instructions:
  "Only use the provided data. Never guess numbers."
  AI returns a natural language explanation.
```

### Why This Is Better

| Current Approach | New Approach |
|---|---|
| Dumps all data into system prompt | Fetches only what's needed per question |
| AI sees raw data and might hallucinate | AI receives structured JSON, cannot guess |
| Queries prospects table (expensive) | Uses only snapshot/profile tables |
| Hard to reuse across apps | Single endpoint, works for app + website |
| No intent classification | AI detects intent first, then controlled queries run |

### Supported Intents (Phase 1)

1. **today_summary** -- Today's leads, responses, enrollments from personal_snapshot_v2
2. **monthly_summary** -- Full month aggregation from personal_snapshot_v2
3. **day_wise_breakdown** -- Day-by-day table for the month
4. **team_count** -- Direct team member count from profiles
5. **team_performance** -- Team members' monthly totals from personal_snapshot_v2
6. **top_performers** -- Ranked team members by total activity
7. **funnel_conversion** -- Stage-by-stage conversion from snapshot stage_tags
8. **enrollment_count** -- final_tag_count sum for the period
9. **compare_months** -- Compare current vs previous month
10. **general_tips** -- Coaching based on available data summary

### Technical Details

**New Edge Function: `supabase/functions/nevorai-ai/index.ts`**

The function has two internal AI calls:

**Call 1 -- Intent Detection (tool calling, non-streaming)**
```text
User message --> AI with tool_choice forced
Tool: classify_intent
Parameters: { intent: string, month_year?: string, compare_month?: string }
```
This uses Lovable AI with tool calling to extract structured intent. No data is fetched yet.

**Call 2 -- Data Explanation (streaming)**
Based on the detected intent, the function runs predefined queries:

| Intent | Tables Queried | What's Returned |
|--------|---------------|-----------------|
| today_summary | personal_snapshot_v2 (date=today) | leads, responses, response_tags, stage_tags, final_tag_count |
| monthly_summary | personal_snapshot_v2 (month_year=X) | aggregated totals across all days |
| day_wise_breakdown | personal_snapshot_v2 (month_year=X) | array of { date, leads, responses, tags } |
| team_count | profiles (leaders_id_of_my_leader=userId) | count + names |
| team_performance | profiles + personal_snapshot_v2 | per-member monthly totals |
| top_performers | profiles + personal_snapshot_v2 | ranked by total_leads or final_tag_count |
| funnel_conversion | personal_snapshot_v2 stage_tags | stage-by-stage numbers |
| enrollment_count | personal_snapshot_v2 final_tag_count | sum of enrollments |
| compare_months | personal_snapshot_v2 (two months) | side-by-side comparison |
| general_tips | personal_snapshot_v2 (current month summary) | coaching prompt |

The query results are formatted as clean JSON and passed as a data block in the system prompt with strict rules:
- "You may ONLY reference the numbers in the DATA block below"
- "If a number is not in the data, say 'I don't have that information'"
- "Never estimate, guess, or calculate numbers not provided"

Then the AI explanation is streamed back to the client.

**Key Domain Definitions (in system prompt)**
- Enrollment = `final_tag_count` (the count in the final stage tag)
- Direct team member = profile where `leaders_id_of_my_leader` = user's `leader_id` (or `user_id`)
- Day 1, Day 2, etc. = `stage_tag_1`, `stage_tag_2`... from `stage_tags` JSON
- Funnel start = `funnel_start_date` from snapshot or `day_1_start` from `funnel_configs`
- Personal data = `personal_snapshot_v2` filtered by `user_id`
- Total (with team) = `total_snapshot_v2` filtered by `user_id`

**Frontend Changes (minimal)**

Update `AIAssistantChat.tsx` to point to the new `nevorai-ai` endpoint instead of `ai-assistant`. The streaming format stays identical (SSE with OpenAI-compatible chunks), so the existing chat UI works as-is. Also update the chat URL constant.

No changes needed to `AIAssistantButton.tsx` or the page integrations (Dashboard, Tracking, ListUp).

**Config**

Add `nevorai-ai` to `supabase/config.toml` with `verify_jwt = false` (auth handled in code). The old `ai-assistant` function can remain for backward compatibility or be removed.

### Files to Create/Modify

| File | Action |
|------|--------|
| `supabase/functions/nevorai-ai/index.ts` | **Create** -- new intent-based AI endpoint |
| `src/components/ai/AIAssistantChat.tsx` | **Modify** -- change CHAT_URL to `nevorai-ai` |
| `supabase/config.toml` | **Auto-updated** -- add nevorai-ai function entry |

### What Does NOT Change
- No database schema changes
- No RLS policy changes
- No changes to existing TrackUp logic or hooks
- No changes to the floating button or page integrations
- Read-only AI (Phase 1) -- no data updates

### Reusability
The `nevorai-ai` endpoint accepts `{ messages, monthYear? }` and returns SSE streams. Any client (app or website) that sends a valid JWT + messages array gets the same behavior. The website TrackUp dashboard can call the same endpoint with the same auth token.

