

# Fix: Lead Tracking Date Mismatch and Tag Count Issues

## Root Cause Analysis

### ISSUE 1: Date Mismatch (Leads counted under previous date)

The `date_added` column is `TIMESTAMPTZ DEFAULT now()` -- stored in UTC. The problem occurs in **three layers**:

**A. Frontend date grouping uses browser-local `getDate()` on UTC timestamps**

In multiple hooks, prospects are grouped by day like this:
```javascript
const addedDate = new Date(p.date_added);  // parses as UTC
const dayIndex = addedDate.getDate() - 1;  // getDate() uses LOCAL timezone
```

This works *only if the browser is in the same timezone as the month being viewed*. For IST users (UTC+5:30), a lead added at 11 PM IST (stored as 5:30 PM UTC same day) works fine. But a lead added at 1 AM IST on Feb 20 is stored as 7:30 PM UTC on Feb 19 -- `getDate()` in IST returns 20, which is correct. However, the query filter uses `monthStart.toISOString()` (UTC midnight), which for IST would miss the first 5.5 hours of the month.

**B. Query date range filters use UTC boundaries**

```javascript
const monthStart = startOfMonth(monthDate);  // midnight LOCAL time
.gte('date_added', monthStart.toISOString())  // converts to UTC
```

`startOfMonth` creates midnight in the browser's local timezone, and `.toISOString()` converts it to UTC. For IST, `Jan 1 00:00 IST` becomes `Dec 31 18:30 UTC`, which actually captures extra records from the previous month's last evening (UTC). Similarly, `endOfMonth` at midnight IST becomes the previous day in UTC.

**C. Server-side SQL functions use `CURRENT_DATE` (UTC)**

The `admin_get_analytics`, `update_daily_stats`, and `admin_get_active_usage_stats` RPC functions all use `CURRENT_DATE` which is UTC-based on the Supabase server. For IST users, "today's leads" will be wrong between 12:00 AM - 5:30 AM IST (when UTC date is still "yesterday").

**D. `useAutoTrackingSync` and `useDailyTrackingLog` use `startOfDay`/`endOfDay` (local browser time)**

```javascript
const dayStart = startOfDay(today).toISOString();
const dayEnd = endOfDay(today).toISOString();
```

These produce correct IST boundaries when the browser is in IST, but the `todayStr = format(today, 'yyyy-MM-dd')` uses local date -- so the date key is correct for the user, but the query range is also correct. This part is actually fine for IST browsers.

**E. `useApplicationSnapshots` uses string slicing**

```javascript
const dateStr = p.date_added.substring(0, 10); // "YYYY-MM-DD"
```

This extracts the UTC date from the ISO string, NOT the IST date. A lead added at 1 AM IST (stored as previous day UTC) would be grouped under the wrong date.

### ISSUE 2: Tag Count Mismatch

**A. `useTrackingStats` (useLeadsTrackingStats) does NOT filter out soft-deleted records**

```javascript
// Comment says "no soft-delete column - hard delete only"
// But the codebase DOES use soft delete (deleted_at column)
.gte('date_added', monthStart.toISOString())
.lte('date_added', monthEnd.toISOString());
// Missing: .is('deleted_at', null)
```

The `useFunnelTrackingStats` has the same issue -- no `deleted_at` filter.

**B. `useLeadsFromProspects` also missing `deleted_at` filter**

Same pattern -- fetches all prospects including soft-deleted ones.

**C. `useAutoTrackingSync` correctly filters `deleted_at`** (line 45) -- this one is fine.

**D. `useApplicationSnapshots` correctly filters `deleted_at`** (line 38) -- also fine.

So the mismatch comes from some hooks counting deleted leads and others not.

---

## Fix Plan

### Fix 1: Create IST date utility functions (new file)

Create `src/lib/dateUtils.ts` with:
- `toIST(date: Date): Date` -- shifts a UTC date to IST equivalent
- `getISTDateStr(date: Date): string` -- returns "YYYY-MM-DD" in IST
- `getISTDayOfMonth(isoString: string): number` -- extracts day number in IST from a `date_added` ISO string
- `getISTMonthBounds(monthYear: string): { start: string, end: string }` -- returns UTC ISO strings representing IST midnight-to-midnight for a full month

### Fix 2: Fix `useTrackingStats.ts` (both `useLeadsTrackingStats` and `useFunnelTrackingStats`)

1. Add `.is('deleted_at', null)` to both queries
2. Replace `monthStart.toISOString()` / `monthEnd.toISOString()` with IST-aware month bounds
3. Replace `new Date(p.date_added).getDate() - 1` with IST-aware day extraction

### Fix 3: Fix `useLeadsFromProspects.ts`

1. Add `.is('deleted_at', null)` to the query
2. Replace UTC-based month range with IST-aware bounds
3. Replace `new Date(p.date_added).getDate() - 1` with IST-aware day extraction

### Fix 4: Fix `useApplicationSnapshots.ts`

1. Replace `p.date_added.substring(0, 10)` (UTC string slicing) with IST-aware date extraction
2. Replace query range filter with IST-aware month bounds

### Fix 5: Fix `useAutoTrackingSync.ts`

1. Replace `startOfDay(today).toISOString()` / `endOfDay(today).toISOString()` with IST-specific day bounds
2. Ensure `todayStr` uses IST date

### Fix 6: Fix `useDailyTrackingLog.ts`

1. Same IST-aware day bounds for the query
2. Ensure `todayStr` and `log_date` use IST date

### Fix 7: Fix server-side SQL functions

Create a migration to update these functions to use IST:
- `admin_get_analytics`: Replace `CURRENT_DATE` with `(now() AT TIME ZONE 'Asia/Kolkata')::date`
- `admin_get_active_usage_stats`: Same fix
- `update_daily_stats`: Replace `CURRENT_DATE` with IST-aware date

---

## Technical Details

### IST Date Utility (`src/lib/dateUtils.ts`)

```text
IST = UTC + 5:30

To get IST start-of-day in UTC:
  IST midnight = UTC previous day 18:30

Example: "today" in IST on Feb 20:
  Start: 2026-02-19T18:30:00Z
  End:   2026-02-20T18:29:59.999Z
```

Key function for day extraction:
```typescript
export function getISTDayOfMonth(isoString: string): number {
  const d = new Date(isoString);
  // Add 5h 30m to get IST
  const ist = new Date(d.getTime() + 5.5 * 60 * 60 * 1000);
  return ist.getUTCDate();
}
```

### SQL Migration Pattern

```sql
-- Replace CURRENT_DATE with IST-aware date
(now() AT TIME ZONE 'Asia/Kolkata')::date

-- Replace date_added::date = CURRENT_DATE with:
(date_added AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date 
  = (now() AT TIME ZONE 'Asia/Kolkata')::date
```

### Files to modify

1. **New:** `src/lib/dateUtils.ts` -- IST utility functions
2. **Edit:** `src/hooks/useTrackingStats.ts` -- deleted_at filter + IST dates
3. **Edit:** `src/hooks/useLeadsFromProspects.ts` -- deleted_at filter + IST dates
4. **Edit:** `src/hooks/useApplicationSnapshots.ts` -- IST date grouping
5. **Edit:** `src/hooks/useAutoTrackingSync.ts` -- IST day bounds
6. **Edit:** `src/hooks/useDailyTrackingLog.ts` -- IST day bounds
7. **New migration:** Update `admin_get_analytics`, `admin_get_active_usage_stats`, `update_daily_stats` SQL functions to use IST

### What will NOT change

- The `date_added` column remains `TIMESTAMPTZ DEFAULT now()` (UTC storage is correct)
- No historical data modification
- No frontend-only timezone hacks -- all logic is centralized in `dateUtils.ts`

