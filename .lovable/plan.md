
# Team Tracking — Real Fix Plan

The zeros on `/team-tracking` are not a UI bug. They are a **data pipeline bug** with three independent root causes. Patching the page won't help until the pipeline is wired correctly. Below is the actual fix, end-to-end.

## Root causes (verified against the DB)

1. **`personal_snapshot_v2.upline_leader_id` is NULL for almost every row.** Only legacy rows have it stamped. The writer accepts a client-provided value and the client almost always passes `null`. Total rollup keyed on `upline_leader_id = <leader>` therefore returns nothing.
2. **Downline members never write APPLICATION snapshots.** Example: Shubhanti's downline (Prashant, Muskan) have 26 + 60 prospects and call activity, but **zero rows** in `personal_snapshot_v2`. Their `tracking_source_preferences.personal_source = MANUAL`, so the auto-derivation from prospects never runs for them. Even if upline was stamped, there'd be nothing to roll up.
3. **The leader's downline is discovered inconsistently.** `useLeaderTeamMembers` resolves the team one way; `update-tracking saveTotalAutomated` validates via `personal_snapshot_v2.upline_leader_id` (which is NULL, so validation drops everyone). Two different "downline" definitions in two layers.

The funnel-wise per-member day grid you showed in the screenshot is rendering, but every cell is `—` because of #1 + #2.

## What I will build

### Phase A — Single source of truth for the upline chain (DB)

Create one SECURITY DEFINER function and use it everywhere:

```sql
public.get_user_upline_chain(p_user uuid) returns table(level int, leader_id uuid)
public.is_upline_of(p_leader uuid, p_member uuid) returns boolean
public.get_direct_downline(p_leader uuid) returns setof uuid
```

Source of truth = `profiles.leaders_id_of_my_leader` resolved through `profiles.neverai_id`. Memoize via a materialized helper view if needed for performance.

Delete the ad-hoc "who is my downline" SQL scattered across hooks and edge functions. Everything calls these three functions.

### Phase B — Auto-stamp `upline_leader_id` (DB trigger)

Add a `BEFORE INSERT OR UPDATE` trigger on `personal_snapshot_v2` and `total_snapshot_v2`:

```sql
NEW.upline_leader_id := (SELECT leader_id FROM public.get_user_upline_chain(NEW.user_id) WHERE level=1);
```

Client/edge-function-provided values are ignored. Backfill existing rows in the same migration:

```sql
UPDATE personal_snapshot_v2 p
   SET upline_leader_id = ul.leader_id
  FROM public.get_user_upline_chain(p.user_id) ul
 WHERE ul.level = 1 AND p.upline_leader_id IS DISTINCT FROM ul.leader_id;
```

Same for `total_snapshot_v2`. After this migration runs, every existing downline row is correctly attributed.

### Phase C — APPLICATION snapshots for everyone, on a schedule

Right now APPLICATION snapshots are written only when a user opens Personal Tracking with APPLICATION mode. That's why downline members with prospects + calls have no rows.

Create one edge function `aggregate-application-snapshots` triggered by `pg_cron` every 15 min:

- For every user with `tracking_source_preferences.personal_source = APPLICATION` OR `team_source = AUTOMATED`, derive today's `personal_snapshot_v2` row from `prospects`, `activity_logs`, `daily_tracking_logs` using the same logic that's already in `useSnapshotV2ComputedData` (port to SQL/PLpgSQL).
- Upsert by `(user_id, date)` with `source='APPLICATION'`. Trigger from Phase B stamps `upline_leader_id` automatically.
- Also trigger on-demand from the client when a prospect/activity row changes, so the leader sees movement within seconds, not 15 min.

### Phase D — Rebuild the leader's Total view on the server

Replace the client aggregation in `useTotalSnapshotV2Read` for `source=TEAM_MEMBERS` with a single RPC:

```sql
public.get_team_total(p_leader uuid, p_month text)
  returns table(date date, total_leads int, total_responses int,
                response_tags jsonb, stage_tags jsonb, member_count int)
```

It walks `get_direct_downline(p_leader)` (or full chain when "Full team" toggle is on), sums `personal_snapshot_v2` for the month, returns one row per date. RLS-safe because it's SECURITY DEFINER and only callable by the leader themselves.

This is what makes the Total cards / Day1·Day2·Day3 strip / per-funnel grid all light up at once, from one query.

### Phase E — Funnel-wise per-member day grid wired to real data

The grid in your screenshot (`Funnel 1 (2-4 Jun)` … `Funnel 8 (23-25 Jun)` × member rows × Day1/2/3) is currently fed by an empty stub. Wire it to:

```sql
public.get_team_funnel_grid(p_leader uuid, p_month text, p_funnels jsonb)
```

Returns `(member_user_id, funnel_index, day_index, value)`. The component renders cells from this single response. Add the `Total` row by summing per (funnel, day) on the server. Star/priority members sort to the top (via `member_priority`, which already exists — no new table).

### Phase F — UI polish (keep current layout, fix the missing pieces)

The screenshot's layout is correct; we keep it. We add the missing things you called out:

- Member names visible in the grid rows (they are — but the column needs a min-width so long names don't truncate to the AS/AM initials shown in the sidebar).
- Day1·Day2·Day3 mini-strip under "Funnel" header reflects the *currently selected* funnel from the funnel-wise dropdown, computed from the same RPC as the grid (no second query, no zero drift).
- "Total" row at the bottom of the grid sums members for each (funnel, day) cell and is visually emphasized (heavier weight, subtle bg).
- Sidebar group counts (AS=2, S=0, AM=0, M=0) are derived from `get_direct_downline` so they match the grid exactly. No more inconsistent counts.
- The "Pro" / "Personal" / "Total" pill in the header reflects the active mode and is the only mode switcher (drop the duplicate left-rail "Personal Tracking / Total Tracking" — that's what was inflating zeros from two different queries hitting two different code paths).

### Phase G — Verification

1. Backfill migration runs → run `select count(*) from personal_snapshot_v2 where upline_leader_id is null and user_id in (select user_id from profiles where leaders_id_of_my_leader is not null)`. Must be 0.
2. Trigger `aggregate-application-snapshots` manually for today → Prashant + Muskan get rows with non-zero leads.
3. Log in as Shubhanti, open `/team-tracking` → Total row shows non-zero, per-funnel grid shows real cells, Day1/2/3 strip matches grid totals.
4. Drill down into a member → their personal snapshot view loads in read-only mode.
5. Drill down through 3 levels (leader → frontline → downline → downline) — breadcrumb works, KPIs rescope.

## Technical notes

- All new SQL is `SECURITY DEFINER` with `SET search_path = public`. RLS unchanged on base tables; access is mediated by the functions.
- No new tracking table is created. Reuses `personal_snapshot_v2`, `total_snapshot_v2`, `member_priority`, `tracking_source_preferences`, `profiles`.
- Backfill is idempotent — safe to re-run.
- Two migrations total: (1) chain functions + auto-stamp triggers + backfill, (2) get_team_total + get_team_funnel_grid RPCs.
- One new edge function: `aggregate-application-snapshots` + a 15-min `pg_cron` schedule.
- ~3 hooks rewritten: `useTotalSnapshotV2Read` (for TEAM_MEMBERS path), new `useTeamFunnelGrid`, `useLeaderTeamMembers` (to call `get_direct_downline`).
- One page rewritten visually: `src/pages/TeamTracking.tsx` keeps current layout, fixes the wiring + the Total row + name column.

## What I will NOT do

- Will not create a new `member_priority` table (already exists).
- Will not change the visual layout of the screenshot — only fix the missing data and the Total row, add member-name column width, and emphasize the active mode pill.
- Will not touch `auth`, `storage`, `realtime`, `vault`, or `supabase_functions` schemas.
- Will not change Personal Tracking writing for users in MANUAL mode — only APPLICATION mode users get the auto-aggregator.

Approve and I'll start with Phase A + B (one migration), then C (edge function + cron), then D + E (second migration + hooks), then F (UI), then G (verification with real data).
