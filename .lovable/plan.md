

# Sticky Table Header on Scroll

## What Changes

When you scroll down through your leads list, the KPI strip, filter bar, and action buttons will scroll up and disappear -- giving you maximum screen space for calling. But the column headers (**#**, **Name**, **Response/Stage**) will stay pinned right below the Leads/Funnel toggle, so you always know which column is which.

When you scroll back up, the KPI strip and filters smoothly reappear.

## How It Works

The current layout has a separate scroll container inside `ProspectTable`. The fix restructures the scroll so that the KPI strip, filters, and table are all in the **same scrollable area** (the Dashboard's `<main>`), while the table header uses CSS `sticky` positioning to pin itself below the fixed header.

## Technical Details

### File: `src/components/prospects/ProspectTable.tsx`

**TableContent changes (lines 194-299):**
- Remove the inner `overflow-y-auto` scroll wrapper from `TableContent`
- The `<thead>` already has `sticky top-0` -- change it to use a CSS variable or a prop-based `top` value so it sticks just below the fixed header (Leads/Funnel toggle height)
- Add a new prop `stickyHeaderTop` (number in px) to `TableContent` so the parent can tell it exactly where to pin the header

**ProspectTable return (lines 988-1043):**
- Remove `overflow-hidden` and `flex-1 flex flex-col min-h-0` from the table wrapper since scrolling is now handled by the parent `<main>`
- The KPI strip, action bar, and table all flow naturally in the document, scrolling with the page

### File: `src/pages/Dashboard.tsx`

**Main scroll area (lines ~280-340):**
- The `<main>` element is already `overflow-y-auto` -- this becomes the single scroll container
- Calculate the fixed header height (logo row + tab row = approximately 110px when search is collapsed, ~154px when expanded)
- Pass `stickyHeaderTop` value to `ProspectTable` matching the fixed header height so the table header pins correctly

### File: `src/hooks/useCollapsibleHeader.ts`

- No changes needed -- it already tracks scroll direction on the main container

### Summary of Behavior

```text
Fixed Header (always visible):
  [Logo]  Calling  [Bell icon]
  [Leads | Funnel toggle]
  [Search bar - collapses on scroll down]

Scrollable Content:
  [KPI Strip]        <-- scrolls away
  [Filters + Actions] <-- scrolls away
  ─────────────────────────────────
  # | Name | Response  <-- STICKS below fixed header
  ─────────────────────────────────
  1 | John | Interested
  2 | Jane | Call Back
  ...
```

### Key Implementation Points

1. `TableContent` thead gets `style={{ top: stickyHeaderTop }}` with `position: sticky` and `z-index: 20`
2. Remove the inner scroll div in `TableContent` -- let the parent handle scrolling
3. The table wrapper in `ProspectTable` loses its `overflow-hidden` constraint
4. SheetTabs at the bottom remain sticky via `position: sticky; bottom: 0`
5. The sentinel for infinite scroll continues to work since it's in the same scroll flow

