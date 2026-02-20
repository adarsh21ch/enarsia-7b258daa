

# UI Clarity Update: Section Renaming and System Metrics

## Overview
This is a UI-only update to reduce user confusion between KPI, TrackUp, and Response Tags sections. No backend logic or calculations will be modified.

## Changes

### Part 1: Rename Sections

**File: `src/components/trackup-v2/CollapsibleKPI.tsx`**
- Add a small title/subtitle above the collapsible row: **"Current Status"** with subtitle **"People in each stage right now"**
- Implementation: Add a tiny header inside the card, before the toggle button. Text will be `text-xs font-semibold` for title, `text-[10px] text-muted-foreground` for subtitle.

**File: `src/pages/Tracking.tsx`**
- Add a small label above the table views section: **"Total Activity"** with subtitle **"All actions done so far"**
- Implementation: Add a minimal header `div` just before the table rendering block (around line 183).

### Part 2: System Auto Metrics in Manage Response Tags

**File: `src/components/prospects/ManageResponseTagsDialog.tsx`**
- At the top of "Section A: Tracking Tags" (line ~382), before the user-created tags, insert two fixed system-level items:
  1. **Leads** with badge "System Calculated"
  2. **Responses** with badge "System Calculated"
- These items will be styled as non-editable rows (no input, no delete, no reorder) with a muted/locked appearance.
- A single line of helper text beneath: "These are automatically tracked and cannot be modified."
- Both the read-only member view and the editable root leader view will show these system items.

### Part 3: Hierarchy Alignment in Settings

**File: `src/components/profile/LeaderTrackingFormatSettings.tsx`**
- In the "Leads Tracking Tags (Responses)" section (line ~984), add the same two system metrics at the top before user tags.
- Update numbering: system items show as #1 and #2, user-created tags start from #3 onward (change `#{index + 1}` on line 1005 to `#{index + 3}`).

### Part 4: Clean UI Design

All additions will follow existing design patterns:
- System metric rows use `bg-muted/20` with a `Lock` icon and a small muted `Badge` saying "System Calculated"
- No large explanation blocks -- just one small helper line
- Consistent `text-[10px]` sizing for helper/badge text
- Minimal spacing changes

## Technical Details

### Files to modify:
1. `src/components/trackup-v2/CollapsibleKPI.tsx` -- Add section title + subtitle
2. `src/pages/Tracking.tsx` -- Add section title + subtitle above tables
3. `src/components/prospects/ManageResponseTagsDialog.tsx` -- Add 2 system metric rows in tracking tags section
4. `src/components/profile/LeaderTrackingFormatSettings.tsx` -- Add 2 system metric rows + update tag numbering

### No changes to:
- Any hooks, contexts, or data computation logic
- Backend functions or database queries
- Tag counting or KPI calculation formulas
