

# Align TrackUp Funnel Display with Website Dashboard

## What's Being Fixed

The funnel-wise table in the app needs to match the website dashboard's display format exactly. The website shows headers like **"Funnel 1 (2-4 Feb)"** while the app currently shows **"F1"** with a small date like "02-02".

The underlying computation logic is already correct -- funnel periods start from the upline's configured day (e.g., 2nd of the month) and team members cannot change this config. The fix is purely a display/formatting improvement.

## Changes

### 1. Update FunnelWiseTable header format to match website
**File:** `src/components/trackup-v2/FunnelWiseTable.tsx`

Change the column headers from:
```
F1
02-02
```

To match the website style:
```
Funnel 1 (2-4 Feb)
```

This means formatting `startDate` and `endDate` into a readable range like "2-4 Feb" or "2 Feb - 4 Feb" and showing "Funnel 1" instead of "F1".

### 2. Include date range in FunnelPeriod label
**File:** `src/hooks/useSnapshotV2ComputedData.ts`

Update the `FunnelPeriod` interface and computation to format dates in a human-readable way. The `label` will show the full funnel name, and the date range will be formatted as "(2-4 Feb)" matching the website.

### 3. Ensure computed data shows date range per funnel period
The `FunnelPeriod` already has `startDate` and `endDate` fields. The FunnelWiseTable will format these as a readable date range in the header, e.g., "2-4 Feb" when both dates are in the same month, or "28 Jan - 1 Feb" when they span months.

## Technical Details

- **FunnelWiseTable.tsx**: Update header rendering to show `Funnel {n}` and a formatted date range `(d-d Mon)` using `format()` from date-fns
- **No backend changes needed** -- all funnel config inheritance (read-only for team members, synced from leader) is already working correctly
- **No changes to computation logic** -- the period grouping based on `configDay` is already correct

