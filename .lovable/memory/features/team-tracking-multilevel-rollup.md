---
name: Team Tracking Architecture (v1)
description: In-app /team-tracking page with multi-level upline visibility via server-side total_snapshot_v2 rollup trigger
type: feature
---
# Team Tracking inside Enarsia (`/team-tracking`)

## Goal
Upline-1 sees their direct team's numbers; upline-2 (top leader) sees direct team AND grand-downline rolled up. Previously this lived on the marketing website's `/trackup` page — now native in Enarsia.

## Critical pieces

### Server-side rollup (DB triggers — DO NOT REMOVE)
- Functions: `public.rollup_total_snapshot_for_user(user_id, date)` + `public.rollup_total_cascade(user_id, date)`.
- AFTER triggers: `trg_personal_rollup_total` on `personal_snapshot_v2`, `trg_total_rollup_parents` on `total_snapshot_v2`.
- Each user's `total_snapshot_v2` = their personal row + sum of every direct downline member's TOTAL row (bottom-up cascade gives grand-totals).
- Downline membership uses DUAL-KEY rule (same as `resolve_upline_leader_id`):
  - child of X if `child.upline_email = X.email` OR `child.leaders_id_of_my_leader = X.neverai_id`, AND `child.allow_leader_to_view = true`.
- Cycle guard: 20-level max, session GUC `app.skip_total_cascade` prevents infinite recursion.

### Write hooks (Enarsia native only — no external Supabase)
- `usePersonalSnapshotV2Write` and `useTotalSnapshotV2Write` MUST call `supabase.functions.invoke('update-tracking', ...)` against Enarsia's own edge function (`supabase/functions/update-tracking/`).
- NEVER reintroduce `WEBSITE_EDGE_URL` (xjnzxxmpidrqjtlvslui), `WEBSITE_ANON_KEY`, or `app_access_token` — that was the website-era SSO hack. Removed June 2026.

### Read hooks
- `usePersonalSnapshotV2Read(monthYear, ..., targetUserId?)` and `useTotalSnapshotV2Read(monthYear, ..., targetUserId?)` accept an optional `targetUserId` so the Team Tracking page can read a downline member's snapshots. RLS allows it because `upline_leader_id` is stamped to the direct upline on write, and SELECT policy is `auth.uid()=user_id OR auth.uid()=upline_leader_id`.
- Top-leader visibility into grand-downline works WITHOUT broader RLS because grand-downline numbers are pre-rolled-up into each intermediate member's `total_snapshot_v2`.

### Team discovery
- `useLeaderTeamMembers(userId, email, neveraiId)` is the canonical hook for downline discovery. It does dual-key `.or('upline_email.eq.<email>,leaders_id_of_my_leader.eq.<neverai_id>')` with `allow_leader_to_view=true`.
- DO NOT use `useDirectTeam` for team-tracking discovery — it's neverai-id-only and silently misses email-connected members.

### Slot keys
All snapshot JSON uses positional slot keys (`response_tag_N`, `stage_tag_N`) via `src/lib/snapshotSlotUtils.ts`. Writing tag labels directly corrupts aggregation.

## Page
`src/pages/TeamTracking.tsx` — sidebar (My Team Total / My Personal / members grouped by leader_level) + reuses existing trackup-v2 view components (SummaryTable / DateWiseTable / FunnelWiseTable / MonthlyTotalsTable / MetricCardView / MetricChartView). Header entry is the "Team Tracking" button on `/tracking`.

## Scope notes
- Read-only team viewing. `team_access.allowed_tabs` is dead schema for this flow.
- Lean parity: this is NOT a 1:1 port of the website's `TrackUpDashboard.tsx` (which had ~50 components for inbox/calling/todo/compulsory-actions/etc). Other tabs already live natively elsewhere in Enarsia — don't duplicate.
- No schema change beyond the rollup trigger; column name `neverai_id` is intentionally misspelled — keep it.
