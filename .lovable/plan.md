

## Rename "Recent Activity" to "Activity History"

### Overview
Rename all user-facing instances of "Recent Activity" to "Activity History" across the app. No logic changes — purely text/label updates.

### Files to Update

1. **`src/pages/Dashboard.tsx`** — Change header title from `'Recent Activity'` to `'Activity History'`

2. **`src/pages/TodoUp.tsx`** — Change header title from `'Recent Activity'` to `'Activity History'`, update comment references

3. **`src/components/tracking/RecentActivity.tsx`** — Change both `<h3>` headings and the "No recent activity" empty state text

4. **`src/components/todo/RecentActivityView.tsx`** — Update the file comment at top, and the "Activities" section heading (already says "Activities" so minimal change)

5. **`src/components/prospects/MobileProspectCard.tsx`** — Change the "Recent Activity" section header in the expanded prospect card

Component file names and imports will stay the same to avoid unnecessary refactoring.

