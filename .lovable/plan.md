

## Fix nevorai-ai: Full Replacement with Tool-Calling Architecture

### Problems Found (3 critical bugs)

1. **Team discovery is broken** (line 113-116): Only queries `profiles.upline_leader_id = userId`. Most team members are linked via `upline_email` or `leaders_id_of_my_leader`, so they return 0 results.

2. **Auth mismatch**: The deployed function reads `Authorization` header (line 471), but the frontend sends `auth_token` in the JSON body. The function never sees the token.

3. **Response format mismatch**: The function returns `text/event-stream` (SSE, line 554), but the frontend calls `resp.json()`. This causes the `SyntaxError` you saw.

Additionally: no label resolution (slot keys like `response_tag_1` are shown raw), no tool-calling loop, and the intent-detection pipeline is fragile.

### Fix

**Replace the entire `supabase/functions/nevorai-ai/index.ts`** with the tool-calling code you provided earlier in the conversation. This code correctly implements:

- Auth via `auth_token` in request body + `supabase.auth.getUser()`
- Team discovery via dual filter: `upline_email = leader_email OR leaders_id_of_my_leader = leader_neverai_id`
- Label resolution from root leader profile (`response_labels`, `stage_labels`)
- Slot-key-to-label mapping (`response_tag_1` becomes the actual tag name)
- 10 read-only tools with AI tool-calling loop (max 5 iterations)
- JSON response: `{ response: string, scope: string }`
- Rate limiting: 50 req/hour per user

### Files Changed

| File | Action |
|------|--------|
| `supabase/functions/nevorai-ai/index.ts` | Full replacement (563 lines old code replaced with ~500 lines tool-calling code) |

### No Other Changes

- Frontend (`AIAssistantChat.tsx`) is already correct -- sends `auth_token`, parses JSON
- No database/RLS/migration changes
- No other components affected

