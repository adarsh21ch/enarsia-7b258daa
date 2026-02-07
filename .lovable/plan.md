
# TrackUp V2: Full Personal + Total Tracking Dashboard

## Overview

Replace the current simple Leads/Funnel tracking page with a full-featured TrackUp dashboard that mirrors the website, supporting both **Personal** and **Total** tracking modes, multiple view types, and an Update Tracking modal.

---

## Phase 1: Data Layer (Hooks and Utilities)

### 1.1 Create snapshot read hooks for V2

Create two new hooks that read from `personal_snapshot_v2` and `total_snapshot_v2` for a given month, returning daily snapshot rows:

- **`src/hooks/usePersonalSnapshotV2Read.ts`** -- Fetches `personal_snapshot_v2` rows for the current user filtered by month. Returns array of snapshots with `date`, `total_leads`, `total_responses`, `response_tags`, `stage_tags`, funnel fields.

- **`src/hooks/useTotalSnapshotV2Read.ts`** -- Same pattern but reads from `total_snapshot_v2`.

Both use React Query with `queryKey` including `user_id` and `monthYear`.

### 1.2 Create computed data hook

- **`src/hooks/useSnapshotV2ComputedData.ts`** -- Takes raw snapshot rows + tracking tags and computes:
  - Daily metrics array (for Date-wise and Funnel-wise tables)
  - Monthly totals per tag
  - KPI values (total leads, responses, per-tag counts, final target count)
  - Summary data (transposed metrics-as-rows format)
  - Funnel period groupings (based on `funnel_length` config)

### 1.3 Create tracking modes hook

- **`src/hooks/useTrackingModes.ts`** -- Manages:
  - `dataMode`: `'personal'` | `'total'` (left pill selector)
  - `viewType`: `'leads'` | `'funnel'` (right pill selector)
  - `viewMode`: `'date-wise'` | `'funnel-wise'` | `'monthly-totals'` | `'summary'` (view dropdown)
  - Auto-switch logic: Leads defaults to `'date-wise'`, Funnels defaults to `'funnel-wise'`

### 1.4 Create snapshot slot utilities

- **`src/lib/snapshotSlotUtils.ts`** -- Utility functions to convert between tag names and slot keys (`response_tag_1`, `stage_tag_2`, etc.) used by the `update-tracking` edge function.

### 1.5 Create `update-tracking` edge function

Deploy **`supabase/functions/update-tracking/index.ts`** in this project's backend. Actions:

| Action | Description |
|--------|-------------|
| `save_personal` | Upsert into `personal_snapshot_v2` using service role |
| `save_total_manual` | Upsert into `total_snapshot_v2` with manual source |
| `save_total_automated` | Aggregate downline snapshots into `total_snapshot_v2` |

Uses `SUPABASE_SERVICE_ROLE_KEY` (auto-available) to bypass RLS for cross-user aggregation.

### 1.6 Create write hooks

- **`src/hooks/usePersonalSnapshotV2Write.ts`** -- Calls `update-tracking` edge function with `action: 'save_personal'`
- **`src/hooks/useTotalSnapshotV2Write.ts`** -- Calls `update-tracking` with `action: 'save_total_manual'` or `'save_total_automated'`

---

## Phase 2: UI Components

### 2.1 Mode Selectors Component

**`src/components/trackup-v2/ModeSelectors.tsx`**

Two 50/50-width pill dropdowns:
- Left: Personal / Total (data mode)
- Right: Leads / Funnels (view type)

Styled with `bg-primary text-primary-foreground` for active state, `ChevronDown` icon, `text-xs font-semibold`.

### 2.2 View Selector Dropdown

**`src/components/trackup-v2/ViewSelector.tsx`**

Dropdown showing view options based on current view type:
- Leads: Date-wise, Monthly Totals, Summary
- Funnels: Funnel-wise, Monthly Totals, Summary

Styled as rounded-full pill button.

### 2.3 Collapsible KPI Section

**`src/components/trackup-v2/CollapsibleKPI.tsx`**

- Collapsed: single row of compact metric badges with dot separators
- Expanded: 3-column grid of KPI cards
- Star icon (amber) for final target tags
- Chevron toggle

### 2.4 Table Components

All tables use a transposed layout (metrics/stages as sticky left column, dates/funnels scrolling horizontally):

- **`src/components/trackup-v2/SummaryTable.tsx`** -- Metrics as rows, all dates as columns. Sticky left column with `bg-primary text-primary-foreground`. Today highlighted. Zeros shown as `--`.

- **`src/components/trackup-v2/DateWiseTable.tsx`** -- For Leads mode. Same transposed layout with date groups, thick right border separators, auto-scroll to today.

- **`src/components/trackup-v2/FunnelWiseTable.tsx`** -- For Funnels mode. Funnel run periods as columns, stage tags as rows.

- **`src/components/trackup-v2/MonthlyTotalsTable.tsx`** -- Standard table with tag columns and monthly aggregate rows.

### 2.5 Manual Update Modal (Drawer)

**`src/components/trackup-v2/ManualUpdateDrawer.tsx`**

Full-screen Drawer (100dvh on mobile) containing:

- **Date strip calendar**: 7-day week view with left/right arrows and "Today" button
- **Category tabs**: Leads / Funnel toggle
- **Two-column layout**: Personal and Total
  - Gear icon on each column header for source selection popover
  - Personal sources: Manual / Application
  - Total sources: Manual / Automated
- **Numeric inputs**: Borderless, `inputMode="numeric"`, blank = not saved, explicit 0 = saved
- **Save button**: "Save and Update" -- disabled until at least one field has data
- **Local cache**: Snapshot data cached per date for instant switching

Uses `usePersonalSnapshotV2Write` and `useTotalSnapshotV2Write` hooks on save.

### 2.6 Floating Action Button (FAB)

**`src/components/trackup-v2/FloatingUpdateButton.tsx`**

- Position: `fixed bottom-20 right-4` (above bottom nav)
- Size: `h-14 w-14 rounded-full bg-primary`
- Icon: Plus
- Opens ManualUpdateDrawer

### 2.7 Team Redirect Button

Part of the header -- opens `https://nevorai.com/trackup` in a new tab. Uses the existing SSO flow from `trackup-sso-link` edge function (already implemented).

---

## Phase 3: Page Assembly

### 3.1 Rewrite `src/pages/Tracking.tsx`

Replace the current two-tab (Leads/Funnel) layout with the full V2 dashboard:

```text
Header
  - Logo + "Track Up" title
  - Team Redirect button (top-right)
  - ModeSelectors (Personal/Total + Leads/Funnels)

Content area
  - View header row: Funnel name, Star KPI, ViewSelector dropdown, 3-dot menu
  - CollapsibleKPI section
  - Active table view (based on viewMode):
    - DateWiseTable | FunnelWiseTable | MonthlyTotalsTable | SummaryTable
  - Month navigator (prev/next arrows)

FloatingUpdateButton -> ManualUpdateDrawer
BottomNav
```

### 3.2 Update `ProfileTrackUp` component

Update the profile page tracking section to also use the new V2 snapshot data instead of the old prospect-based tracking stats.

---

## Phase 4: Styling

No CSS variable changes needed -- the existing theme already uses the correct primary blue color. The new components will use existing Tailwind classes and shadcn/ui components consistent with the current design system.

---

## Technical Details

### Database tables used (all already exist)

| Table | Purpose |
|-------|---------|
| `personal_snapshot_v2` | Personal tracking data per user per date |
| `total_snapshot_v2` | Total/team tracking data per user per date |
| `tracking_source_preferences` | Manual/Auto source settings |
| `profiles` | Response/stage labels, funnel config |
| `funnel_configs` | Funnel length and start date |

### New files to create (~15 files)

| File | Type |
|------|------|
| `src/hooks/usePersonalSnapshotV2Read.ts` | Hook |
| `src/hooks/useTotalSnapshotV2Read.ts` | Hook |
| `src/hooks/useSnapshotV2ComputedData.ts` | Hook |
| `src/hooks/useTrackingModes.ts` | Hook |
| `src/hooks/usePersonalSnapshotV2Write.ts` | Hook |
| `src/hooks/useTotalSnapshotV2Write.ts` | Hook |
| `src/lib/snapshotSlotUtils.ts` | Utility |
| `src/components/trackup-v2/ModeSelectors.tsx` | Component |
| `src/components/trackup-v2/ViewSelector.tsx` | Component |
| `src/components/trackup-v2/CollapsibleKPI.tsx` | Component |
| `src/components/trackup-v2/SummaryTable.tsx` | Component |
| `src/components/trackup-v2/DateWiseTable.tsx` | Component |
| `src/components/trackup-v2/FunnelWiseTable.tsx` | Component |
| `src/components/trackup-v2/MonthlyTotalsTable.tsx` | Component |
| `src/components/trackup-v2/ManualUpdateDrawer.tsx` | Component |
| `src/components/trackup-v2/FloatingUpdateButton.tsx` | Component |
| `supabase/functions/update-tracking/index.ts` | Edge Function |

### Files to modify

| File | Change |
|------|--------|
| `src/pages/Tracking.tsx` | Full rewrite to V2 layout |
| `src/components/profile/ProfileTrackUp.tsx` | Use V2 snapshot data |
| `supabase/config.toml` | Add `update-tracking` function config |

### Implementation order

1. Utility files and slot conversion helpers
2. Read hooks (personal + total snapshot)
3. Computed data hook
4. Tracking modes hook
5. Edge function (`update-tracking`)
6. Write hooks
7. UI components (mode selectors, KPI, tables)
8. Manual Update Drawer
9. FAB button
10. Page assembly (rewrite Tracking.tsx)
11. Profile section update

This is a large feature that will be built incrementally. The existing old tracking components (`DynamicLeadsTracker`, `DynamicFunnelTracker`) will remain available but the Tracking page will switch to the new V2 components.
