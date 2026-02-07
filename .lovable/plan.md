

# TrackUp App: Sync Alignment and Mirror UI Fixes

## What This Changes

Ensure the App TrackUp is a pure mirror of the Website TrackUp by adding sync events, fresh DB hydration in the Update Drawer, and source controls -- without touching any existing backend logic, edge function, KPI computation, or aggregation rules.

## Changes (5 files modified, 0 files created)

### 1. Write Hooks: Dispatch sync events after successful saves

**`src/hooks/usePersonalSnapshotV2Write.ts`**
- After successful `queryClient.invalidateQueries`, dispatch `window.dispatchEvent(new CustomEvent('trackup:personal-snapshot-synced', { detail: { userId: user.id, month: monthYear } }))`
- No logic changes to save payload or edge function call

**`src/hooks/useTotalSnapshotV2Write.ts`**
- Same pattern: dispatch `trackup:total-snapshot-synced` event after successful save
- No logic changes

### 2. Read Hooks: Listen for sync events and refetch

**`src/hooks/usePersonalSnapshotV2Read.ts`**
- Add `useEffect` that listens for `trackup:personal-snapshot-synced` custom event
- When event fires and `detail.month` matches current `monthYear`, call `refetch()`
- Cleanup listener on unmount

**`src/hooks/useTotalSnapshotV2Read.ts`**
- Same pattern: listen for `trackup:total-snapshot-synced` and refetch when month matches

### 3. ManualUpdateDrawer: Fresh DB hydration and source controls

**`src/components/trackup-v2/ManualUpdateDrawer.tsx`**
- When the drawer opens, always re-read snapshot values from the passed-in `personalSnapshots` and `totalSnapshots` props (which are already live from the read hooks)
- Add `useTrackingSourcePreferences` hook integration:
  - Show a gear icon on each column header (Personal / Total)
  - Personal gear: popover with Manual / Application options
  - Total gear: popover with Manual / Automated options
  - Selected source is passed to the write hooks on save
- Pass the correct `source` value from preferences to `savePersonal()` and `saveTotal()` calls
- Reset form values when `open` transitions from false to true (forces fresh hydration from DB snapshots)

---

## What Is NOT Changed

- `update-tracking` edge function -- zero modifications
- `useSnapshotV2ComputedData` -- zero modifications
- `snapshotSlotUtils` -- zero modifications
- `useTrackingModes` -- zero modifications
- `useTrackingFormat` -- zero modifications
- `useTrackingSourcePreferences` -- zero modifications (already exists and works)
- All KPI formulas, aggregation rules, and policies remain untouched
- All existing table components remain untouched
- `Tracking.tsx` page layout remains untouched

## Technical Details

### Sync Event Flow

```text
User saves in App ManualUpdateDrawer
  -> writeHook calls update-tracking edge function
  -> On success: invalidateQueries + dispatch CustomEvent
  -> Read hooks hear event -> refetch() from DB
  -> Tables and KPIs re-render with fresh data
```

### Source Control Mapping

| Column | Options | Maps to write hook param |
|--------|---------|--------------------------|
| Personal | Manual, Application | `source: 'MANUAL'` or `source: 'APPLICATION'` |
| Total | Manual, Automated | `source: 'MANUAL'` or `source: 'TEAM_MEMBERS'` |

### Files Modified

| File | Change |
|------|--------|
| `src/hooks/usePersonalSnapshotV2Write.ts` | Add sync event dispatch |
| `src/hooks/useTotalSnapshotV2Write.ts` | Add sync event dispatch |
| `src/hooks/usePersonalSnapshotV2Read.ts` | Add sync event listener |
| `src/hooks/useTotalSnapshotV2Read.ts` | Add sync event listener |
| `src/components/trackup-v2/ManualUpdateDrawer.tsx` | Add source controls, fresh hydration on open |

