# Team Tracking — Phases 4 to 8

Continuing the approved Team Tracking rebuild on the shared backend (`kisankusogixarejjphi`). Phases 1–3 are done (snapshot upline stamping, hybrid slot/label merge, team-member discovery). No new tables will be created — `member_priority` already exists and will be reused via the existing `supabase` client.

## Phase 4 — Recursive drill-down with breadcrumb
- Add a breadcrumb stack state in `src/pages/TeamTracking.tsx` (`[{userId, name}]`).
- When a leader clicks a downline member, push onto the stack and re-invoke `useLeaderTeamMembers` with that member as the new "leader root".
- Sidebar then shows THAT member's direct downline only (never siblings of the previous level).
- Breadcrumb bar at the top lets the leader jump back to any prior level or root.
- All KPI cards and Eye-view stay scoped to the currently selected member at the top of the stack.

## Phase 5 — Eye-view "Updated" rule fix
- Rebuild `EyeViewSheet.tsx` data resolution:
  - Mark a member **Updated** if EITHER a snapshot row exists for today OR `tracking_source_preferences.personal_source = 'APPLICATION'` / `team_source = 'AUTOMATED'`.
  - Blank ≠ 0; zero still renders as "—" but member is still flagged Updated.
- Fetch `tracking_source_preferences` for all visible members in one batched query keyed by `user_id`.

## Phase 6 — Prospect View Mode (read-only upline access)
- Migration: add SELECT-only RLS policies on `prospects`, `todos`, `user_daily_task_status`, `daily_tracking_logs`, `activity_logs` allowing rows where the row's `user_id` belongs to a member whose `upline_leader_id = auth.uid()` (use a SECURITY DEFINER helper `is_upline_of(member_user_id)` to avoid recursion).
- New route `/team-tracking/member/:userId/prospects` rendering a read-only wrapper around the existing Calling / Follow-up / To-do / Tracking tabs, with all mutations disabled (no add, edit, delete, status change).
- Open button on each member card in the sidebar and on the KPI header.

## Phase 7 — Reuse existing `member_priority` table
- NO migration. Use `@/integrations/supabase/client` directly against the existing `public.member_priority(leader_id, member_user_id, rank, created_at)`.
- `useMemberPriority` hook already exists; wire a star toggle next to each member in the sidebar.
- Sort: priority members first (by `rank` asc, then name), then everyone else.
- Add an optional "Priority only" filter chip in the sidebar header.

## Phase 8 — Rename and prune
- Replace "TrackUp" / "TrackUp Dashboard" with "Team Tracking" across labels, page titles, and nav.
- On `/team-tracking` only, hide Tracking Format, Forms, and Team Actions tiles and any paywall lock icons (other surfaces unchanged).

## Phase 9 — Verification (no code, just checks)
For a real active leader:
1. Their snapshot rows all have `upline_leader_id` stamped.
2. Total view shows non-zero numbers matching the member's own mobile-app numbers.
3. Personal / Total toggle changes every KPI consistently.
4. Eye-view marks APPLICATION-source members **Updated** even when all values are zero.
5. Drill-down breadcrumb traverses 2+ levels correctly and "Back" works.
6. Prospect read-only page opens for a downline member with all four tabs and no mutations available.

## Technical notes
- Single Supabase client (`@/integrations/supabase/client`) — already pointed at `kisankusogixarejjphi`. No second client, no duplicate tables.
- All new RLS predicates go through SECURITY DEFINER helpers with `SET search_path = public` (matches existing project pattern).
- Read-only enforcement is BOTH UI (disabled controls) AND RLS (no INSERT/UPDATE/DELETE policies added for uplines).
- Mobile-first, high-density layout preserved; no scroll on root `/team-tracking`.
