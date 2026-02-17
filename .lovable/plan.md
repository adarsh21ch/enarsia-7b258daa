
# UI Refinement Update -- Premium SaaS Look

A visual polish pass across the Calling tab, Follow-up tab, Leads table, Funnel leads view, and Tracker tables to achieve a clean, structured, Stripe/Linear-inspired design language.

---

## 1. Tag Design: Rounded Pill to Rounded Rectangle

All tag badges (StatusBadge, StageBadge, ActionBadge, GenericTagBadge, PriorityBadge, EnrollBadge) currently use `rounded-full` (pill shape). These will be changed to a subtle rounded rectangle.

**Changes in `src/components/prospects/StatusBadge.tsx`:**
- Replace `rounded-full` with `rounded-md` (6px) across all badge components
- Set consistent height `h-7` (28px), horizontal padding `px-3` (12px), font-weight `font-semibold`
- Ensure min-width consistency

**Before:** `rounded-full text-xs font-medium`
**After:** `rounded-md text-xs font-semibold h-7`

This also applies to the FunnelLeadsTable badges in `src/components/funnels/FunnelLeadsTable.tsx`.

---

## 2. KPI Strip: Clean Dot-Based Design

The KPI strip already uses the middle-ground dot approach. Minor refinement:

**Changes in `src/components/prospects/KPIStrip.tsx`:**
- Add subtle border (`border border-border/50`) to each chip for definition
- Keep `bg-muted/50` background (already done)
- Ensure the total count chip also uses consistent rounded-md styling

---

## 3. Table Header: Subtle Blue Accent

**Changes in `src/components/prospects/ProspectTable.tsx` (TableContent):**
- Add a subtle blue bottom border on the header row: `border-b-2 border-accent/30`
- Remove heavy `bg-muted` from header -- use `bg-muted/60` for a lighter look
- Ensure consistent left padding across columns

---

## 4. Table Rows: Clean Hover, No Heavy Highlights

**Changes in `src/components/prospects/ProspectRow.tsx`:**
- Simplify row backgrounds: remove alternating `bg-muted` striping, use uniform `bg-card`
- Keep the subtle colored left-border accent (already good)
- Hover effect: `hover:bg-muted/40` (light grey, not heavy)
- Remove `bg-primary/5` on expanded rows -- use `bg-muted/30` instead
- Last-contacted highlight: soften from `bg-primary/10` to `bg-accent/5`

---

## 5. CallingFunnelTabs (Leads/Funnel Toggle): Consistency

**Changes in `src/components/prospects/CallingFunnelTabs.tsx`:**
- Switch active tab from `bg-primary` (dark/black) to `bg-accent` (blue) for brand consistency
- Use `rounded-lg` instead of `rounded-xl` to match the new border-radius system
- Remove heavy shadow on active tab

---

## 6. Action Buttons: Visual Hierarchy

**Changes in `src/components/prospects/ProspectFilters.tsx`:**
- The "+" add button (primary action) stays strong with `bg-primary`
- Retargeting and Export buttons: keep `variant="outline"` (already secondary)
- Consistent `rounded-lg` on all buttons

---

## 7. Tracker Tables: Consistent Styling

**Changes in `src/components/trackup-v2/SummaryTable.tsx`, `DateWiseTable.tsx`, `FunnelWiseTable.tsx`, `MonthlyTotalsTable.tsx`:**
- Use `rounded-lg` instead of `rounded-xl` on table containers
- Keep the existing clean design (already mostly aligned)

---

## 8. Global Border Radius Consistency

Ensure `rounded-lg` (8px) is the standard across:
- Table containers
- Cards
- Tag badges use `rounded-md` (6px)
- Buttons use default `rounded-md`
- No mixed `rounded-xl` / `rounded-full` on structural elements

---

## Files to Modify

| File | Change |
|---|---|
| `src/components/prospects/StatusBadge.tsx` | All badges: `rounded-full` to `rounded-md`, consistent sizing |
| `src/components/prospects/KPIStrip.tsx` | Add subtle border to chips, consistent rounded-md |
| `src/components/prospects/ProspectTable.tsx` | Header: lighter bg, blue bottom border accent |
| `src/components/prospects/ProspectRow.tsx` | Remove striped rows, soften hover/expanded states |
| `src/components/prospects/CallingFunnelTabs.tsx` | Active tab: use accent blue, rounded-lg |
| `src/components/funnels/FunnelLeadsTable.tsx` | Badge consistency |
| `src/components/trackup-v2/SummaryTable.tsx` | rounded-lg container |
| `src/components/trackup-v2/DateWiseTable.tsx` | rounded-lg container |
| `src/components/trackup-v2/MonthlyTotalsTable.tsx` | rounded-lg container |
| `src/lib/tagColors.ts` | Increase default badge bg opacity from `22` (hex) to `1A` for subtle tint |
