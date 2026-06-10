## Goal

Make `/team-tracking` show real, correct numbers for active downline (today they show 0), then layer on the missing capabilities (true-access drill-down, eye-view tracking status, prospect view mode, member priority), and rename "TrackUp Dashboard" → "Team Tracking" everywhere — keeping the current page layout.

## Root cause of the zero numbers (verified against live DB)

In `personal_snapshot_v2` + `total_snapshot_v2` for the last 60 days, only **2 of 17** rows have `upline_leader_id` stamped. RLS only lets a leader read a row when `auth.uid() = upline_leader_id`, so 88% of downline activity is invisible to uplines → dashboard shows 0.

Why it happens:
- The `resolve_upline_leader_id` trigger likely didn't exist when many rows were written, or it can't resolve when the downline profile changes upline later.
- No retroactive restamp when a member connects/reconnects to a leader.

## Phase 1 — Fix zero-numbers (data + RLS) [migration]

1. Recreate `resolve_upline_leader_id(user_id)` SECURITY DEFINER fn using the exact dual-key fallback: `profiles.root_leader_id` → leader by `upline_email` → leader by `leaders_id_of_my_leader = neverai_id`. Returns the leader's `user_id`.
2. Recreate BEFORE INSERT/UPDATE trigger `trg_resolve_upline` on `personal_snapshot_v2`, `total_snapshot_v2`, `team_snapshot_v2` that sets `NEW.upline_leader_id = resolve_upline_leader_id(NEW.user_id)` whenever NULL.
3. One-time backfill: `UPDATE … SET upline_leader_id = resolve_upline_leader_id(user_id) WHERE upline_leader_id IS NULL`.
4. Add a SECURITY DEFINER `restamp_upline_for_user(uid)` and call it from a trigger on `profiles` AFTER UPDATE of `upline_email | leaders_id_of_my_leader | root_leader_id` so re-parenting restamps history.
5. Confirm SELECT policies on all three snapshot tables are `auth.uid()=user_id OR auth.uid()=upline_leader_id`; add if missing.

## Phase 2 — Hybrid slot/label merge in reader [code]

`src/lib/snapshotSlotUtils.ts` currently chooses slot keys OR label keys (`hasSlotKeys` short-circuits). Change `parseSnapshotRow` (and the readers' useMemo mappers) to a true **hybrid merge** (`coerceToSlots`): start from slot-key values per position; for any position with no slot value, fall back to the legacy label value; never sum both. This prevents undercount on old rows.

## Phase 3 — Team-member discovery polish [code]

- Already correct (dual-key OR + `allow_leader_to_view`). Keep.
- Skip level grouping when `leader_levels` is empty (currently fine — verify the sidebar doesn't render an empty "Unleveled" group that hides members). Add an "All members" group when no levels exist.

## Phase 4 — True-access recursive drill-down [code]

When user clicks a downline member in the sidebar, the existing page already accepts `targetUserId` for snapshot reads. Add:
- A breadcrumb stack so clicking a member's downline-of-downline keeps drilling.
- A second `useLeaderTeamMembers(member.user_id, member.email, member.neverai_id)` invocation in a child view so the sidebar shows THAT member's downline only (never siblings).
- "Back to my team" resets the stack.

## Phase 5 — Eye-view (tracking status) per day [code]

`EyeViewSheet.tsx` exists. Rebuild its data source: for each member × date in selected month, mark **Updated** if a snapshot row exists OR `tracking_source_preferences.personal_source = 'APPLICATION'` / `team_source = 'AUTOMATED'`. Date strip + per-member dot grid.

## Phase 6 — Prospect View Mode (read-only) [migration + code]

Add upline-read RLS to the data tables a leader should see for one downline member at a time:
- `prospects`: add SELECT policy `auth.uid() = user_id OR auth.uid() = public.resolve_upline_leader_id(user_id)`.
- Same for `todos`, `user_daily_task_status`, `daily_tracking_logs`, `activity_logs`.
- No data mutations from this view (writes still scoped to `auth.uid() = user_id`).

New page `/team-tracking/member/:userId/prospects` reusing existing read-only versions of: Calling tab, Follow-Up tab, To-do tab, Tracking tab. Multi-select across members via query param `?members=id1,id2`.

## Phase 7 — Member priority [migration + UI]

New table `public.member_priority(leader_id uuid, member_user_id uuid, rank int, PRIMARY KEY(leader_id, member_user_id))` with GRANTs and RLS scoped to `leader_id = auth.uid()`. Sidebar gets a star toggle per member; "Priority" tab sorts priority members on top.

## Phase 8 — Rename + hide unused links [code]

- Replace "TrackUp Dashboard" / "Nevorai TrackUp" labels with "Team Tracking" wherever present in this feature.
- The brief says hide Tracking Format / Forms / Team Actions — those are in the in-app Tracking sidebar (not /team-tracking). Confirm `/team-tracking` doesn't link to them; remove any leftover entries.
- Remove paywall/Pro lock icons from the Team Tracking page (full access for all tiers).

## Phase 9 — Verification (acceptance)

For one real leader account with active calling downline:
- Query `personal_snapshot_v2` rows for the downline this month → all rows have `upline_leader_id` stamped.
- Leader's `/team-tracking` Total view shows non-zero matching the member's own mobile-app numbers.
- Personal/Total toggle changes every KPI consistently.
- Eye-view marks APPLICATION-source members as Updated even with all-zero data.
- Click a member → drill into their dashboard → click their downline → drill again.
- Open a member's Prospects → read-only Calling/Follow-up/To-do/Tracking work.

## Technical notes / footguns honored

- Keep misspelled `neverai_id` column name as-is.
- Snapshot label keys are positional (`response_tag_N` / `stage_tag_N`); labels come from root leader's tracking format.
- Never write snapshots client-side from this dashboard — viewing only. Existing update paths via `update-tracking` edge function untouched.
- Use SECURITY DEFINER with `SET search_path = public` for all helper fns.
- Migrations include GRANTs per the public-schema grant rule.
- "Updated" rule for eye-view: snapshot row exists OR source is APPLICATION/AUTOMATED. Blank ≠ 0; zero renders as "—".

## Out of scope (not touching)

- Mobile-app snapshot write logic (already works — just wasn't being stamped/RLS-readable).
- Tracking Format editor, Forms, Team Actions.
- Paywall / subscription tier logic.