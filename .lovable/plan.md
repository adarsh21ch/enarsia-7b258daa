

# Fix: Eliminate Loading Delay on TrackUp Page

## Root Cause

`Tracking.tsx` calls `useTrackingFormat()` directly, which creates a **second, independent instance** of the hook. This triggers fresh database queries (profile fetch, leader RPC calls) every time the page opens -- causing the loading spinner.

Meanwhile, the `TrackingFormatProvider` at the app root **already has all this data loaded** since app startup. It just isn't being used on this page.

## Fix

**1 file modified: `src/pages/Tracking.tsx`**

- Replace `import { useTrackingFormat } from '@/hooks/useTrackingFormat'` with `import { useTrackingFormatContext } from '@/contexts/TrackingFormatContext'`
- Change the hook call from `useTrackingFormat()` to `useTrackingFormatContext()`
- Remove the `formatLoading` conditional and the loading spinner -- data is already available instantly from the context
- Keep all other logic exactly the same (same variable names, same destructuring)

## What Does NOT Change

- No database, edge function, or backend changes
- No changes to any other component or hook
- No changes to KPI, table, or drawer logic
- The tracking format data itself is identical -- just sourced from the already-loaded context instead of a fresh fetch

## Result

TrackUp page opens instantly with all rows (Leads, Response tags, Stage tags) visible at once -- no spinner, no staggered loading.

