

## Fix: Funnel Table Total vs KPI Mismatch

### Root Cause
The funnel periods start on your configured "Day 1 Start" date (Feb 2nd). Any data before that date (Feb 1st) is skipped by the funnel grouping logic -- it falls before Funnel 1. However, the KPI grid sums the entire month (all 28 days), causing the mismatch.

### Solution
Include the days before the funnel start (e.g., Feb 1) as part of Funnel 1, so the table totals match the KPI totals.

### Technical Details

**File:** `src/hooks/useSnapshotV2ComputedData.ts`

In the funnel period computation (around line 172-174), the current logic skips days where `daysSince < 1`:

```
daysSince = differenceInCalendarDays(date, monthStart) + 1;
if (daysSince < 1) return; // THIS SKIPS PRE-FUNNEL DAYS
```

The fix: instead of skipping pre-funnel days, assign them to period 1 (Funnel 1). Change the logic so that any day before the funnel start date gets bucketed into the first funnel period:

```
const periodNum = daysSince < 1 ? 1 : Math.ceil(daysSince / funnelLength);
```

This removes the early return and ensures all days in the month are included, making the Funnel table Total column match the KPI numbers exactly.

