
# TrackUp Table Layout Stabilization

## Problem
The Metric column expands too wide after all rows load because `table-layout: auto` recalculates widths as new rows render. This causes visible layout shifts and wastes horizontal space.

## Solution
Switch all four tables to `table-layout: fixed` with a `<colgroup>` that locks the Metric column to a narrow fixed width, giving remaining space to date columns.

## Changes

### 1. DateWiseTable.tsx
- Change `tableLayout: 'auto'` to `tableLayout: 'fixed'`
- Add `<colgroup>` with first `<col>` set to `width: 120px` and remaining date columns set to equal distribution
- Remove `w-0` from the metric `<th>` (no longer needed with fixed layout)
- Keep `whitespace-nowrap` and `px-2` on metric cells

### 2. SummaryTable.tsx
- Same `table-layout: fixed` + `<colgroup>` approach
- First column: `120px` fixed width
- Remaining columns: auto-distributed

### 3. FunnelWiseTable.tsx
- Same `table-layout: fixed` + `<colgroup>` approach
- First "Stage" column: `120px` fixed width

### 4. MonthlyTotalsTable.tsx
- Same `table-layout: fixed` + `<colgroup>` approach
- First "Month" column: `120px` fixed width

### 5. PersonalTagExpandableRows.tsx
- No structural changes needed -- it already renders matching `<td>` cells per column, so it inherits the fixed column grid automatically
- The helper text row with `colSpan` will also align correctly under fixed layout

## Technical Details

The key change in each table component:

```text
Before:
  <table style={{ tableLayout: 'auto' }}>
    <thead>
      <tr>
        <th className="... w-0">Metric</th>
        ...

After:
  <table style={{ tableLayout: 'fixed' }}>
    <colgroup>
      <col style={{ width: '120px' }} />
      {columns.map(() => <col key={...} />)}
    </colgroup>
    <thead>
      <tr>
        <th className="...">Metric</th>
        ...
```

- `table-layout: fixed` locks column widths after first render based on `<colgroup>` definitions
- Date/data columns without explicit width share remaining space equally
- No layout recalculation when new rows appear
- Personal tag expansion adds rows but cannot change column widths
- `w-max min-w-full` on the table ensures horizontal scroll still works when there are many date columns
