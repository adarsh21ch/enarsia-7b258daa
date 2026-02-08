

# Fix: Funnel-wise View "No Data Available"

## Safety Confirmation

This change is 100% safe and does NOT affect the website dashboard in any way:

- This file (`useSnapshotV2ComputedData.ts`) exists only in the App's codebase
- The website has its own separate code — no shared frontend files
- No database, edge function, or backend changes whatsoever
- Only the funnel period grouping logic changes; KPIs, monthly totals, and daily metrics remain untouched

## What Changes

**1 file modified: `src/hooks/useSnapshotV2ComputedData.ts`**

Only the `funnelPeriods` useMemo block (lines 130-190) is replaced.

**Current (broken):** Filters snapshots by `funnelDay !== null && funnelDay > 0` -- this column is always `null` in the database, so zero results are returned.

**New (matches website):** Uses date arithmetic from the leader's `day_1_start` config:

```text
For each daily metric:
  daysSince = differenceInCalendarDays(metricDate, funnelStartDate) + 1
  if daysSince < 1 -> skip (before funnel started)
  periodNum = Math.ceil(daysSince / funnelLength)
  -> Group into "F1", "F2", etc. and aggregate stage totals
```

## What Does NOT Change

- Zero changes to the website dashboard (separate codebase entirely)
- Zero database or edge function changes
- Zero changes to KPI calculations, monthly totals, or daily metrics
- Zero changes to read/write hooks, slot key mapping, or UI components
- Only the `funnelPeriods` computation block is rewritten with an import of `differenceInCalendarDays` from `date-fns`

