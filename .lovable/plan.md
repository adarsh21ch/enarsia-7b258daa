

# Fix: Upline Not Seeing Downline's Tracking Numbers

## Root Cause

There is a **value mismatch** between what gets saved and what gets queried:

- **When saving**: The app passes `uplineLeaderId` = the leader's `neverai_id` (e.g., "ABC123") because `directLeaderId` in TrackingFormatContext maps to `neverai_id`
- **When the upline reads downline data**: The query uses `.eq('upline_leader_id', user.id)` where `user.id` is the leader's **UUID** (e.g., "550e8400-e29b-...")
- Since "ABC123" does not equal "550e8400-e29b-...", the query returns **zero rows** and the upline sees nothing

## Fix

We need to save the leader's **UUID** (not `neverai_id`) as `upline_leader_id` so the upline's downline query matches correctly.

### Changes

**1. `src/hooks/useTrackingFormat.ts`** -- Expose `directLeaderUserId` (UUID)

- Add `directLeaderUserId: string | null` to the `TrackingFormat` interface
- Set it from `fetchLeaderFormat`'s returned `leaderUserId` (which already contains the UUID)
- Root leaders get `null` for this field

**2. `src/contexts/TrackingFormatContext.tsx`** -- Pass through the new field

- Add `directLeaderUserId` to the context type
- Expose it from the provider

**3. `src/pages/Tracking.tsx`** -- Use UUID instead of neverai_id

- Read `directLeaderUserId` from the context (instead of `directLeaderId`)
- Pass it as `uplineLeaderId` to the ManualUpdateDrawer

This ensures that when a team member saves their snapshot with `upline_leader_id = <leader's UUID>`, the upline's query `.eq('upline_leader_id', user.id)` will find a match.

### Technical Detail

```text
BEFORE (broken):
  Save:  upline_leader_id = "ABC123"     (neverai_id)
  Query: upline_leader_id = "550e8400-..." (UUID)
  Result: NO MATCH

AFTER (fixed):
  Save:  upline_leader_id = "550e8400-..." (UUID)
  Query: upline_leader_id = "550e8400-..." (UUID)
  Result: MATCH -- upline sees data
```

### Safety
- No database schema changes needed
- No edge function changes needed
- Only affects new saves going forward; existing mismatched rows can be corrected by the user re-saving their tracking for those dates
