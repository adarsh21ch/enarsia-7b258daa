

## Calling Tab UI/UX Refinement

### Overview
A comprehensive visual polish of the Calling tab (Dashboard.tsx) and its child components. Strictly UI/UX — no backend or logic changes. All existing functionality (search, retargeting, import, sheets, streak, response updates) remains intact.

### Changes by File

---

#### 1. `src/pages/Dashboard.tsx` — Header & Layout Restructuring

**Header cleanup:**
- Tighten padding from `py-3` to `py-2.5`, reduce logo size from `h-10 w-10` to `h-9 w-9`
- Move streak badge inline with title using `gap-1.5` instead of `gap-2`
- Reduce title from `text-xl` to `text-lg`, subtitle stays `text-xs`
- Keep Clock (Activity History) icon on right, reduce from `h-[22px]` to `h-5`

**Search bar behavior upgrade (key change):**
- Replace the always-visible `<SearchBar>` with the existing `<CollapsibleSearchBar>` component (already built at `src/components/prospects/CollapsibleSearchBar.tsx`)
- Add `searchCollapsed` state — defaults to `true` on mobile
- When collapsed: show compact search icon button inline with the action row (inside ProspectTable)
- When expanded: search bar takes full width, hide Retargeting/Import/More buttons
- Add "Cancel" button to exit search mode
- Pass `isSearchExpanded` and `onSearchCollapse`/`onSearchExpand` callbacks to control visibility of action buttons

**KPI strip repositioning:**
- Move KPI strip rendering from inside `ProspectTable` to Dashboard.tsx, placed between TopTabBar and the search/action row
- Pass `kpiTotal`, `kpiTagCounts`, `prospects`, and `isCalling` to a `<KPIStrip>` rendered directly in Dashboard header area (below the toggle, above the table)

---

#### 2. `src/components/prospects/ProspectTable.tsx` — Action Row & Search Integration

**Action row with collapsible search:**
- Integrate `CollapsibleSearchBar` into the action row (left side)
- When search is collapsed: show `[🔍] [Retargeting ▾] [Import] [⋯]` in one row
- When search is expanded: show `[Search input...] [Cancel]` — hide retargeting, import, more
- Smooth CSS transition using existing CollapsibleSearchBar animation

**KPI strip removal from ProspectTable:**
- Remove the `<KPIStrip>` render from ProspectTable (lines ~1017-1020) since it moves to Dashboard header

**Visual improvements to action row:**
- Consistent `h-9` height for all buttons
- `rounded-xl` for Import and More buttons
- Better gap spacing (`gap-2`)

---

#### 3. `src/components/prospects/ProspectRow.tsx` — Lead Row Visual Refinement

**Name hierarchy:**
- Increase name font weight: add `font-semibold` (already present, keep)
- Phone number: change from `text-[9px]`/`text-[10px]` to `text-[10px]`/`text-[11px]` for better readability
- Slightly more line-height spacing between name and phone

**Left color accent line:**
- Reduce border-left from `3px` to `2.5px` for a more elegant look

**Call icon:**
- Keep existing `CallIconButton` but ensure consistent sizing `h-8 w-8` on mobile (up from `h-6 w-6`)
- Softer rounded corners on the icon container

**Response tag pills:**
- Handled by `StatusBadge` / `ActionBadge` — add consistent `px-2.5 py-0.5 text-[11px] rounded-lg` styling

**Row spacing:**
- Increase row padding from `py-2.5` to `py-3` for more breathing room
- Reduce border opacity from `border-border/30` to `border-border/20`

---

#### 4. `src/components/ui/TopTabBar.tsx` — Premium Segmented Control

- Increase height from `h-9` to `h-10`
- Add `rounded-xl` to TabsList for more premium feel
- Stronger active state: ensure active tab has `shadow-sm` and clear background contrast
- Increase font from `text-xs` to `text-[13px]`
- Icon size from `h-3.5` to `h-4`

---

#### 5. `src/components/prospects/KPIStrip.tsx` — Visual Polish

- Refine pill styling: consistent `rounded-lg` instead of `rounded-full`
- Slightly larger text: `text-[11px]` for labels, `text-xs font-bold` for counts
- Better dot indicator sizing: `h-2.5 w-2.5`
- Add subtle separator between KPI items using `border-r border-border/30` or `|` visual

---

#### 6. `src/components/prospects/SheetTabs.tsx` — Bottom Sheet Bar Polish

- Cleaner active state: use `bg-primary text-primary-foreground` with `shadow-sm`
- Inactive tabs: `bg-transparent text-muted-foreground`
- Better padding and touch targets: `min-h-[36px] px-3`
- Slightly rounded corners: `rounded-lg`

---

#### 7. `src/components/layout/BottomNav.tsx` — Navigation Polish

- Reduce nav height from `h-[68px]` to `h-[62px]`
- Better label sizing: `text-[10px]` (from `text-[9px]`)
- Stronger active indicator: `h-1.5 w-4 rounded-full` (was `h-1 w-1`)
- Consistent icon sizing at `h-5 w-5`
- Remove excessive bottom padding (`pb-[15px]` to `pb-2`)

---

### Technical Notes

- All changes are CSS/className modifications — no state logic, data flow, or API changes
- The `CollapsibleSearchBar` component already exists and handles expand/collapse with animation
- KPI strip data props (`kpiTotal`, `kpiTagCounts`) are already available in Dashboard.tsx
- No new dependencies needed

