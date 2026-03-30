

# Follow-Up Tab Upgrade Plan

## Current State
The Follow-Up tab has a simple layout: header with Leads/Funnel toggle, search bar, tag filters, and an accordion list of prospects. It lacks any activity/timeline view.

## What Changes

### 1. Add Activity History toggle icon in the header (like Calling tab)
- Add a **Clock icon** button to the top-right of the header (same pattern as Dashboard's Activity History toggle)
- When active, it highlights with `bg-accent` styling
- Tapping it switches the main content between **Prospects list** (current view) and **Activity History**

### 2. Reuse the existing `RecentActivityView` component
- When Activity History is active, render `<RecentActivityView />` with its built-in calendar strip
- This gives date-based filtering, prospect change timeline, and search — all already built
- The Leads/Funnel TopTabBar and tag filters hide when Activity view is active (clean focus)

### 3. Show inline tag badges on prospect rows
- Add small response/stage tag badges next to each prospect name in the collapsed row
- Makes the list more scannable without needing to expand each row

### 4. Header layout update
- Left: Logo + title + count
- Right: Clock icon (Activity toggle) + Clear filters button (when applicable)

## Technical Details

**File: `src/pages/ListUp.tsx`**
- Import `RecentActivityView` from `@/components/todo/RecentActivityView`
- Import `Clock` from lucide-react
- Add `showRecentActivity` state (boolean, default false)
- In header right section: add Clock icon button with active state styling
- In main content: conditionally render `<RecentActivityView />` OR the current prospects list based on `showRecentActivity`
- Add inline tag badges to the collapsed prospect row (small `Badge` components after the name)

**No new files or database changes needed.** This reuses existing components entirely.

