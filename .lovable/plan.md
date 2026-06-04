
# Export My Data — flexible backup & download

Give users a real "take my data home" feature so they can recover leads if anything is lost or deleted. One reusable export engine, two entry points, free vs Pro split.

## What the user gets

- **In Sheet tabs (Calling tab) → "Download All" / Sheet menu**
  Tapping Download opens a popup instead of instantly exporting.
- **In Profile → new "Export My Data" row**
  Full-page version for backups, with date range + grouping.

Both surfaces use the **same engine and same popup component** — just different launch points.

## Export popup options

A single `ExportDialog` with these controls:

1. **Scope**
   - All leads
   - Current sheet only (when launched from a specific sheet)
   - Pick sheets (multi-select)

2. **Date range** (filters by `date_added`)
   - All time
   - Last 7 days / Last 30 days / Last 90 days
   - This month / Last month
   - Custom from–to (shadcn date picker)

3. **Grouping** (how tabs inside the .xlsx are split)
   - One combined sheet (default — free)
   - One tab per existing Sheet (Pro)
   - One tab per month (Pro)
   - One tab per week (Pro)

4. **Columns**: fixed set = current export columns **plus** `Last Response` (latest non-empty of `action_taken` / `funnel_stage`) and `Last Response At`. No column picker (keeps UI simple, matches your answer).

5. **Pro gating**
   - Free: only "One combined sheet" + "All time" or last 30 days
   - Pro: every grouping + custom date range + multi-sheet selection
   - Existing `export_data` feature flag stays the gate; advanced options show a small "Pro" badge and trigger the upgrade drawer when clicked on free.

## Output file

- Single `.xlsx` with multiple tabs depending on grouping
- Filename: `Enarsia_Export_{YYYY-MM-DD}_{scope}.xlsx`
- Tab order: chronological (oldest → newest) for month/week grouping; alphabetical for per-sheet grouping
- Each tab has a small header block (row 1–2): "Sheet: X • Range: ..." then column headers in row 3, data from row 4
- Empty groups are skipped (no blank tabs)

## Where it lives in code

```text
src/components/export/
  ExportDialog.tsx           ← shared popup UI (scope/range/grouping)
  exportEngine.ts            ← pure function: prospects[] + options → xlsx blob
  groupProspects.ts          ← helpers: byMonth, byWeek, bySheet (IST)
src/pages/profile/
  ExportData.tsx             ← full-page entry, lazy-routed at /profile/export
```

Wiring:
- `src/components/prospects/SheetTabs.tsx` — replace direct `onExportSheet?.(null)` / `onExportSheet?.(sheet.id)` calls with `setExportTarget(...)` that opens `ExportDialog`.
- `src/components/trackup/ExportFunnelData.tsx` — keep the existing simple export but add a "More export options →" link that opens the same dialog.
- `src/pages/Profile.tsx` — add a new menu row "Export My Data" → navigates to `/profile/export`.
- `src/App.tsx` — lazy route for `ExportData`.

## Data & gating

- Source: existing `prospects` table via `useGlobalProspects` (already loaded/cached). No new DB tables, no schema migration needed.
- Sheet names: `useSheets`.
- Pro check: `usePermissions().checkFeature('export_data')` for advanced options; free users still get the basic combined export.
- IST-aware grouping (matches the project-wide IST standard): convert `date_added` to IST before bucketing into month/week.

## Technical notes

- Use already-installed `xlsx` package (`SheetJS`) — same lib `ExportFunnelData` uses, no new deps.
- "Last Response" derivation:
  ```ts
  const lastResponseAt = [p.action_taken_at, p.funnel_stage_at]
    .filter(Boolean).sort().pop();
  const lastResponse = lastResponseAt === p.action_taken_at
    ? p.action_taken : p.funnel_stage;
  ```
- Week buckets: ISO weeks in IST, labeled `2026-W23 (Jun 1–7)`.
- Month buckets: labeled `Jun 2026`.
- Column widths reuse the existing widths from `ExportFunnelData.tsx`.
- Toast progress + success count, same pattern as today.
- No backend / no edge function changes.

## Out of scope (intentionally)

- Auto-scheduled backups / email-the-file
- CSV / PDF formats (xlsx only, matches current behavior)
- Column picker UI
- Importing exports back in (separate flow already exists)

Once you approve, I'll switch to build mode and implement.
