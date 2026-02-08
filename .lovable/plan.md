
# Fix: Auto-Resolve upline_leader_id via Database Trigger

## Problem
The app's write hooks send tracking data to the **website's edge function** (external project), not to the local one. Modifying the local edge function alone has no effect. The `upline_leader_id` arriving in the database is often NULL or a neverai_id string instead of a UUID, so the upline's RLS policy (`auth.uid() = upline_leader_id`) fails and team members' rows appear blank.

## Solution
Create a PostgreSQL **BEFORE INSERT OR UPDATE trigger** on both `personal_snapshot_v2` and `total_snapshot_v2` that automatically resolves the correct upline leader UUID before the row is written. This works regardless of which edge function or client wrote the data.

## How It Works

```text
BEFORE INSERT/UPDATE trigger fires
  |
  +--> Fetch profile for NEW.user_id
  |      -> gets upline_email, leaders_id_of_my_leader
  |
  +--> IF upline_email exists:
  |      Find profile WHERE email = upline_email -> set NEW.upline_leader_id = that user_id
  |
  +--> ELSE IF leaders_id_of_my_leader exists:
  |      Find profile WHERE neverai_id = leaders_id_of_my_leader -> set NEW.upline_leader_id = that user_id
  |
  +--> Return NEW (with corrected upline_leader_id)
```

## What Changes

**Database only** -- a single migration with:

1. **One SECURITY DEFINER function**: `resolve_upline_leader_id()` -- looks up the writing user's profile, resolves the upline's UUID via email (primary) or neverai_id (fallback), and sets `upline_leader_id` on the row.

2. **Two triggers** (one per table):
   - `trg_resolve_upline_personal` on `personal_snapshot_v2` BEFORE INSERT OR UPDATE
   - `trg_resolve_upline_total` on `total_snapshot_v2` BEFORE INSERT OR UPDATE

## What Does NOT Change
- No frontend code changes
- No edge function changes
- No RLS policy changes
- No schema column changes
- Website behavior unchanged -- trigger fires for all writes regardless of source

## Why This Is Better Than the Edge Function Approach
- The edge function fix only works if the **local** edge function is called, but the app calls the **website's** edge function on a different Supabase project
- A trigger fires at the database level for ALL writes, covering both app and website paths
- Zero frontend changes required (as requested)

## Technical Details

The trigger function will be created as `SECURITY DEFINER` with `SET search_path = public` to safely query the profiles table without RLS interference. It will:
- Always override `upline_leader_id` with the resolved UUID (ignoring client-sent values)
- Gracefully handle cases where no upline is found (sets NULL)
- Handle the edge case where `upline_leader_id` is already a valid UUID matching the correct leader (no-op)
