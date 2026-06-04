## Simplify Export My Data

Strip the dialog down to the minimum. No date range, no scope picker, no week grouping. One screen, two questions, done.

### New Export dialog (replaces current one)

```
┌─────────────────────────────────────────┐
│  ⬇  Export Leads                    ✕  │
│  Download all your leads as Excel.      │
│                                         │
│  HOW TO ORGANIZE                        │
│  ◉ One file (all leads together)        │
│  ○ Split by sheet           [PRO]       │
│  ○ Split by month           [PRO]       │
│                                         │
│         [ Cancel ]  [ ⬇ Export Excel ]  │
└─────────────────────────────────────────┘
```

That is the entire UI. No date range. No "which leads" picker. Always exports **every lead the user has, all time**.

### Behavior

- **Free users**: only "One file" is selectable. The two PRO rows are visible but locked with a small PRO badge; clicking shows the upgrade nudge.
- **Pro users**: all three options selectable. "Split by month" produces one tab per month (e.g. `Jun 2026`, `May 2026`, …), tabs ordered newest → oldest. Inside each tab, rows are sorted by `date_added` descending — that gives the "date-wise inside monthly" view the user described, no extra UI needed.
- **Split by sheet**: one tab per existing sheet, plus an `Unassigned` tab if needed.
- Filename: `Enarsia_Export_YYYY-MM-DD.xlsx`.

### Entry points (unchanged surfaces, simpler dialog)

- **Profile → Export My Data** page: keep as-is, just opens the new dialog.
- **Calling tab → Sheet menu**: keep "Quick Download" (current one-click per-sheet export) and "Custom Export…" which opens the same simplified dialog. No pre-scoping needed since the dialog always exports everything.

### Correctness fixes

- Make sure the export pulls from `useGlobalProspects()` (all sheets, all leads) — not the currently filtered view. Verified `ExportData.tsx` already does this; confirm `SheetTabs` path also passes the global list, not the sheet-filtered list.
- Include leads with no `date_added` in a `No Date` tab when splitting by month (so nothing is silently dropped).
- Keep the existing column set + `Last Response` + `Last Response At (IST)`. No changes there.
- Toast shows `Exported N leads across M tabs`.

### Files to change

- `src/components/export/ExportDialog.tsx` — rewrite: remove scope selector, date-range grid, custom-range picker, week grouping. Keep only the 3 grouping radios with PRO gating.
- `src/components/export/exportEngine.ts` — remove `scope`, `sheetIds`, `dateRange`, `week` grouping code paths. Add `No Date` bucket for month grouping. Keep combined / sheet / month only.
- `src/pages/ExportData.tsx` — minor copy update to match.
- `src/components/prospects/SheetTabs.tsx` — "Custom Export…" now just opens the dialog (no pre-scope prop needed).

No backend, no schema, no new deps.

### Out of scope

Date range filters, week grouping, per-sheet multi-pick, column picker, CSV/PDF, scheduled backups.
