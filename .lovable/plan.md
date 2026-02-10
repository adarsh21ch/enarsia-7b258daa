

## Replace nevorai-ai with Tool-Calling Architecture

### What Changes

Two files updated:

**1. `supabase/functions/nevorai-ai/index.ts`** -- Complete replacement with the user-provided code:
- Replaces the 2-step intent-detect-then-fetch pattern with a proper **AI tool-calling loop**
- 10 read-only tools: `get_snapshot_kpis`, `get_team_kpis`, `list_team_members`, `get_member_kpis`, `get_rankings`, `search_prospects`, `get_prospect_details`, `get_funnel_stages`, `get_conversion_rates`, `get_tracking_status`
- Label resolution from root leader profiles (response_labels, stage_labels)
- Slot-key-to-label mapping for response_tags and stage_tags
- Team discovery via dual filter (`leaders_id_of_my_leader` + `upline_email`)
- Tool call loop (max 5 iterations) -- AI decides which tools to call
- Returns `{ response: string, scope: string }` as JSON (NOT SSE streaming)
- Auth via `auth_token` field in request body (not Authorization header)
- Rate limiting: 50 requests/hour per user

**2. `src/components/ai/AIAssistantChat.tsx`** -- Update to match the new non-streaming JSON response format:
- Send `auth_token` in request body instead of Authorization header
- Parse JSON response (`{ response }`) instead of reading SSE stream
- Remove all streaming/SSE parsing logic (reader, decoder, textBuffer, upsertAssistant)
- Keep everything else: SimpleMarkdown, suggestions, UI layout, conversation history

### Technical Details

**Edge function request format (new):**
```json
{
  "messages": [{ "role": "user", "content": "My stats today" }],
  "auth_token": "<jwt>"
}
```

**Edge function response format (new):**
```json
{
  "response": "Total Leads: 42 (Personal, This Month)\n• Video Send: 17\n• Enrolled: 12",
  "scope": "Leader"
}
```

**Frontend sendMessage flow (simplified):**
1. POST to nevorai-ai with `{ messages, auth_token }`
2. Await JSON response
3. Append `result.response` as assistant message
4. No streaming -- response appears all at once

### No Other Changes
- No database or RLS changes
- No changes to AIAssistantButton, Dashboard, Tracking, or ListUp pages
- config.toml already has nevorai-ai registered
