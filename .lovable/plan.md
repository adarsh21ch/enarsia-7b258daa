## Add Table View to Leads & Funnel (Universal Components)

Build a shared **PeopleView** layer used by both Leads and Funnel tabs, with a view switcher (Card / Table / Kanban-soon), a TanStack table, and a shared detail modal.

### New files

1. **`src/components/people/ViewSwitcher.tsx`**
   - 3-icon segmented control (LayoutGrid / Table2 / Kanban).
   - Reads/writes `localStorage['people_view_mode']` (values: `card` | `table`).
   - Kanban disabled with tooltip "Coming soon".
   - Auto-forces `card` on mobile (`useIsMobile`) and shows a one-time toast hint when downgrading from table.

2. **`src/components/people/PersonTableView.tsx`**
   - TanStack Table v8 (`@tanstack/react-table` — already in deps; install if missing).
   - Columns: checkbox, Name, Phone 1, Stage, Quality, Last Updated (relative), Source, Actions (3-dot).
   - Sortable headers, column resize, show/hide columns dropdown, search input (name/phone/email), filter dropdowns (Stage/Quality/Source).
   - Pagination 50/page (client-side over the already-paginated React Query data; auto-loads next page when nearing end).
   - Bulk action bar: Delete / Change Stage / Send WhatsApp / Export CSV.
   - Row click (outside actions) → opens existing `ProspectDetailModal`.
   - Inline-edit Notes (click → input → Enter saves via `onUpdate`).
   - Tablet (`md` but not `lg`): hides Source + Last Updated via responsive classes.

3. **`src/components/people/PeopleView.tsx`**
   - Wrapper accepting all the props `ProspectTable` already takes plus a `source: 'leads' | 'funnel'` flag.
   - Owns the view-mode state, renders `ViewSwitcher` + (`ProspectTable` for card mode | `PersonTableView` for table mode).
   - Passes the same `prospects`, handlers, sheets, pagination props through to either child — single data source.

### Edits

4. **`src/pages/Dashboard.tsx`**
   - Replace the two `<ProspectTable>` blocks with `<PeopleView source="leads"|"funnel" ... />` (same props, just wrapped).
   - No changes to data fetching, sheets, KPI strip, or header.

5. **`src/components/prospects/ProspectDetailModal.tsx`** (already universal — re-export from `src/components/people/PersonDetailModal.tsx` as a thin alias so future consumers import from `people/`).

### CSV export

- Use existing `exportEngine` if compatible, otherwise simple in-place CSV builder for selected (or all loaded) rows. Filename `nevorai-leads-{YYYY-MM-DD}.csv` (Leads) / `nevorai-funnel-{date}.csv` (Funnel).

### Performance & preservation

- No new network calls; reuses `useProspectsQuery` data already fetched in `Dashboard`.
- Sheet tabs, KPI strip, search, infinite pagination, import flow, card view behavior all untouched.
- View preference shared across both tabs via single localStorage key.
- Mobile auto-switches to card (with toast hint) and hides the Table option visually.

### Out of scope (explicit)

- No Kanban implementation (button disabled).
- No virtualization unless loaded > 200 (skip for v1 — TanStack table handles 50/page fine).
- No schema/migration changes.
