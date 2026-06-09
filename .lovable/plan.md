## Goal

1. Demo leads behave like a real, deletable sheet — not mixed into "All".
2. Demo leads light up the same surfaces real leads do (Follow-up activity, Tracking numbers).
3. Kill the "Response Tag picker shows empty + can't close" bug that appears after ~30–40 min of use.

---

## 1) Demo leads as a real, isolated sheet

Today the seeder already creates a `Demo Leads` sheet with `is_demo=true`, but those prospects also appear under **All**. The user wants them visible **only** when the user opens the Demo Leads sheet.

### Frontend (`src/hooks/useProspectsQuery.ts`)
- In both the KPI query (around line 60) and the infinite-scroll query (around line 131), when `sheetId` is `null` (i.e. "All" view), add `query.eq('is_demo', false)`.
- When a specific `sheetId` is selected (including the Demo Leads sheet), do not filter — they show normally.
- Net effect: demo leads only appear inside the Demo Leads sheet tab, and disappear from "All" automatically once the user deletes that sheet.

Tagging, calling, WhatsApp, Response Tag, Stage Tag, edit, delete already work on demo rows (no `is_demo` gating in the row components) — once they're in their own sheet the user will be able to use every feature on them exactly like real leads. No row-level code changes needed.

---

## 2) Demo data shows up in Follow-up + Tracking

The seed function (`public.seed_demo_data_for_user`) already inserts `activity_logs` rows (so Recent Activity will populate), but it does **not** populate the tracking snapshot for today, which is why the Tracking tab looks empty until the user manually tags a real lead.

### Migration — extend `seed_demo_data_for_user`
After the existing prospect loop, compute today's tag counts from the just-inserted demo prospects and insert one row into `personal_snapshot_v2` for the current IST day with `source='APPLICATION'`:

```sql
-- Pseudocode inside the function, after the FOR loop:
INSERT INTO public.personal_snapshot_v2 (
  user_id, snapshot_date, source,
  total_leads, total_responses,
  response_tags, stage_tags
)
SELECT
  p_user_id,
  (date_trunc('day', now() AT TIME ZONE 'Asia/Kolkata'))::date,
  'APPLICATION',
  count(*) FILTER (WHERE p.is_demo),
  count(*) FILTER (WHERE p.action_taken IS NOT NULL),
  jsonb_object_agg(...response counts...),
  jsonb_object_agg(...stage counts...)
FROM public.prospects p
WHERE p.user_id = p_user_id AND p.is_demo = true
ON CONFLICT (user_id, snapshot_date, source) DO UPDATE SET ...;
```

Also add the same row to `total_snapshot_v2` so the user's Tracking tab shows numbers immediately, with the exact totals that match the seeded demo data.

To-Do tab: the seeder already inserts the default daily tasks and a placeholder To-Do — that's fine, no change.

---

## 3) Response Tag picker goes blank / unclosable after ~30–40 min

Root cause: `useTrackingFormat` is a hand-rolled hook (not react-query). It loads once on mount. If the auth session refresh or the realtime subscription drops in the background, the `loadTrackingFormat` call can silently fail and the in-memory `trackingFormat` becomes `null` while `loading=false`. The picker then renders no rows and the empty-state path doesn't crash but feels stuck.

### Frontend (`src/hooks/useTrackingFormat.ts`)
- On `loadTrackingFormat` failure, **fall back to the cached format** (`getCachedTrackingFormat(user.id)`) instead of leaving state empty.
- Add a `visibilitychange` + `focus` listener that calls `loadTrackingFormat()` when the tab regains focus and the last fetch was > 60s ago.
- Track the last successful fetch timestamp in a ref; expose it to skip redundant refetches.

### Frontend (`src/components/prospects/ResponseTagSheet.tsx`)
- If the dialog opens and both `trackingOptions` and `nonTrackingOptions` are empty (no cached tags either), trigger `refreshFormat()` from `useTrackingFormatContext` once on open so the user never sees a permanently empty picker.
- Keep the existing Cancel footer + backdrop close paths; the picker is already a centered Dialog so dismiss works even when content is empty.

---

## Files touched

- `src/hooks/useProspectsQuery.ts` — hide `is_demo` from All view.
- `src/hooks/useTrackingFormat.ts` — cache-fallback + focus refetch.
- `src/components/prospects/ResponseTagSheet.tsx` — auto-refresh on empty open.
- New migration extending `public.seed_demo_data_for_user` to also seed `personal_snapshot_v2` + `total_snapshot_v2` for the seeding day.

No changes to tag save logic, dialog centering, RLS, or unrelated tabs.

---

## Out of scope

- Backfilling tracking snapshots for users who were seeded before this change (they can re-trigger seed by deleting demo and clearing `demo_data_created`, but that's a separate admin task).
- Re-skinning the Demo Leads sheet badge (already shows a DEMO chip).
