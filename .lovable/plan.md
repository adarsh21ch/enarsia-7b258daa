

# Fix: Make Tracking Source Preference Truly Persistent

## Problem

The tracking source preference (Manual / Automatic) is stored in the database and should persist across devices and sessions. However, there is a **race condition**: while the preference is loading from the database, the hook defaults to `'MANUAL'`. Any component that reads the value during this brief loading window sees `'MANUAL'` instead of the user's actual saved preference.

This means:
- On page refresh, the gear icon briefly shows "Manual" even if the user set "Automated"
- If the drawer opens before the query resolves, inputs appear enabled (Manual mode) when they should be disabled (Auto mode)
- On the website side, the same race could cause a save with the wrong source value

## Solution

**1 file modified: `src/hooks/useTrackingSourcePreferences.ts`**

- Expose `isLoading` more prominently so consumers can wait for the real value
- Keep the default fallback to `'MANUAL'` (this is correct for first-time users who have no row yet)
- No changes needed to the hook itself -- the persistence logic is correct

**1 file modified: `src/components/trackup-v2/ManualUpdateDrawer.tsx`**

- Read `isLoading` from `useTrackingSourcePreferences()`
- While `isLoading` is true, disable all inputs and show a brief loading state for the source gear icons
- This prevents the drawer from displaying "Manual" mode before the real preference loads
- Once loaded, the correct preference (Manual or Auto) is shown and stays permanent

## What Does NOT Change

- No database changes
- No edge function changes
- No API changes
- No KPI or calculation changes
- The `tracking_source_preferences` table and RLS are already correct
- The preference already persists in the database across all devices and sessions -- this fix just prevents the UI from showing a stale default during the loading window

## Technical Detail

The root cause is that `preferences?.personal_source || 'MANUAL'` returns `'MANUAL'` when `preferences` is `null` (still loading). The fix ensures the UI waits for the actual DB value before rendering the source state, so users never see a flickering "Manual" that contradicts their saved "Automated" preference.

