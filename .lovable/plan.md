
## Fix: Make "Export Leads" button respect selected sheet and filters

### Problem
The "Export Leads" button in the three-dot dropdown menu calls `exportToExcel()`, which only checks for active stage/action/search filters. It ignores the currently selected sheet tab (e.g., "22 March", "Ads"). So clicking Export while viewing a specific sheet exports ALL data instead of just that sheet's leads.

### Solution
Modify the `exportToExcel` function in `ProspectTable.tsx` to be context-aware:

1. **If a specific sheet is selected** → export only that sheet's prospects (using `exportSheet` logic with `fetchAllForExport(selectedSheetId)`)
2. **If retargeting/filter tags are active** → export only filtered prospects (already works for stage/action filters, but needs to include the currently visible `filteredProspects` which already respect all filters)
3. **If on "All" with no filters** → export all data (current behavior)

### File Changes

**`src/components/prospects/ProspectTable.tsx`**
- Update `exportToExcel` to check `selectedSheetId` first. If a sheet is selected, fetch all prospects for that sheet via `fetchAllForExport(selectedSheetId)` (bypasses pagination), then apply any active filters on top.
- Update the filename to include the sheet name when a specific sheet is selected.
- The dropdown "Export Leads" button already calls this function — no wiring changes needed.

### Logic Flow
```text
Export Leads clicked
  ├── selectedSheetId exists?
  │     ├── YES → fetch all from that sheet
  │     │         ├── filters active? → apply filters on fetched data
  │     │         └── no filters → export all sheet data
  │     └── NO (All view)
  │           ├── filters active? → export filteredProspects (current behavior)
  │           └── no filters → fetchAllForExport(null) for all data
  └── Generate filename with sheet name + filter label
```

This is a single-file change to the `exportToExcel` function (~20 lines modified).
