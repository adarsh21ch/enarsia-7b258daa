

# Fix: Import Leads Not Showing on Today's Date Sheet

## Investigation Results

The database shows that the sheet auto-creation IS working -- a "21 Feb" sheet exists and 15 leads are correctly assigned to it. However, there are two real bugs found:

### Bug 1: `batch_date` Uses UTC Instead of IST

In `src/hooks/useProspectsQuery.ts` (line 575):
```
batch_date: p.batch_date || new Date().toISOString().split('T')[0]
```

This produces UTC date. At 2:45 AM IST on Feb 21, it stores `2026-02-20` instead of `2026-02-21`. This causes date-based views/filters that rely on `batch_date` to show leads under the wrong date.

### Bug 2: Sheet Name Uses Browser Locale (Not Explicitly IST)

In `src/hooks/useSheets.ts` (line 9):
```
const getTodaySheetName = () => format(new Date(), 'd MMM');
```

This uses the browser's local timezone. While it works for IST browsers, it should use the explicit IST utility for consistency with the rest of the codebase (in case the user's device timezone is misconfigured).

### Bug 3: `activity_date` in Streak Uses UTC

In `src/hooks/useProspectsQuery.ts` (line 634):
```
activity_date: new Date().toISOString().split('T')[0]
```

Same UTC issue -- streak activity may be logged under the wrong IST date.

---

## Fix Plan

### File 1: `src/hooks/useProspectsQuery.ts`

- **Line 575**: Replace `new Date().toISOString().split('T')[0]` with `getTodayIST()` from `src/lib/dateUtils.ts`
- **Line 634**: Replace `new Date().toISOString().split('T')[0]` with `getTodayIST()`
- Add import for `getTodayIST` from `@/lib/dateUtils`

### File 2: `src/hooks/useSheets.ts`

- **Line 9**: Replace `format(new Date(), 'd MMM')` with an IST-aware version using `toIST()` from dateUtils
- This ensures the sheet name matches the IST date even if the browser timezone is wrong
- Add import for `toIST` from `@/lib/dateUtils`

### No Database Changes Needed

The `date_added` column (TIMESTAMPTZ) is correctly stored in UTC. The `sheet_id` foreign key is working. Only the derived `batch_date` string and sheet naming need IST alignment.

---

## Technical Details

### `batch_date` fix:
```typescript
import { getTodayIST } from '@/lib/dateUtils';
// Before: new Date().toISOString().split('T')[0]
// After:  getTodayIST()  // returns "YYYY-MM-DD" in IST
```

### Sheet name fix:
```typescript
import { toIST } from '@/lib/dateUtils';
import { format } from 'date-fns';
const getTodaySheetName = () => {
  const ist = toIST(new Date());
  return format(ist, 'd MMM');
};
```

### Files to modify:
1. `src/hooks/useProspectsQuery.ts` -- 2 lines (batch_date + activity_date)
2. `src/hooks/useSheets.ts` -- 1 line (sheet name function)

