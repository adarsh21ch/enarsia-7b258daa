

# Admin Panel UI/UX Overhaul

## Issues to Fix

1. **Remove "Funnels Pro"** from the plan filter dropdown -- no users have this plan, it adds confusion
2. **SubscriptionPieChart** currently fakes Basic vs Pro split with `Math.ceil(activePro * 0.5)` -- needs real tier data
3. **EnhancedStatsGrid** says "Pro Users" generically -- should distinguish Basic vs Pro
4. **UserListDrawer** title says "Pro Users" -- should say "Paid Users" or split by tier
5. **UsageLimitsManager** references "Pro users" everywhere -- should use "Basic/Pro" terminology

## Genuine UI/UX Upgrade for Admin Panel

### A. `EnhancedUsersTab.tsx` -- Complete Redesign
- Remove `funnels_pro` from `PLAN_FILTER_OPTIONS`
- Add quick-stat chips at top: total count per tier (Free: X, Basic: X, Pro: X) computed from fetched data
- Compact user cards: put email + badges on one line, stats inline, actions as icon buttons instead of bulky dropdowns
- Add a "copy email" button on each user card
- Color-code left border of each card by tier (gray = Free, blue = Basic, amber = Pro)

### B. `Admin.tsx` -- Better Tab Layout
- Replace horizontal scroll tabs with a cleaner icon-only bottom-sheet style or a 2-row grid of tabs on mobile
- Group related tabs: "Users" | "Business" (Analytics, Revenue) | "Config" (Plans, Offers, Limits, Features) | "Ops" (Support, Audit, Notify)
- Add a sticky summary bar below the header showing key KPIs (Total Users, Paid, Revenue) always visible

### C. `EnhancedStatsGrid.tsx` -- Split "Pro Users" into tiers
- Rename "Pro Users" card to "Paid Users" with subtext showing "X Basic + Y Pro"
- Or add two separate stat cards for Basic and Pro counts

### D. `SubscriptionPieChart.tsx` -- Real tier data
- Update the `SubscriptionBreakdown` interface and RPC to return tier-level counts instead of faking the 50/50 split
- Show actual Free / Basic / Pro / Expired segments

### E. `UserListDrawer.tsx` -- Update titles
- "Pro Users" drawer title → "Paid Users (Basic & Pro)" with tier badge on each user

### F. `UsageLimitsManager.tsx` -- Update terminology
- Change "Pro users" references to "Basic & Pro users" where applicable

## Files to Modify
- `src/components/admin/EnhancedUsersTab.tsx` -- remove Funnels Pro, add tier stat chips, color-coded cards, compact layout
- `src/pages/Admin.tsx` -- sticky KPI bar, grouped tabs
- `src/components/admin/EnhancedStatsGrid.tsx` -- split Pro into Basic/Pro
- `src/components/admin/SubscriptionPieChart.tsx` -- use real tier data from RPC
- `src/components/admin/UserListDrawer.tsx` -- update titles/labels
- `src/components/admin/UsageLimitsManager.tsx` -- update Pro terminology
- `src/hooks/useAdminAnalytics.ts` -- update SubscriptionBreakdown to include tier counts
- Database migration: update `admin_get_analytics` or add new RPC to return tier-level subscription counts

## Technical Details

### Database: New/Updated RPC
Add tier-level breakdown to the subscription query so the pie chart shows real data:
```sql
-- Returns counts per tier: free, pro (Basic), premium (Pro), expired
```

### User Card Redesign (EnhancedUsersTab)
```text
┌─ blue border ─────────────────────────────┐
│ user@email.com  [Basic] [Day 3 of Trial]  │
│ John Doe • NVR103271                      │
│ 30 leads · Direct · 15m ago · Exp Mar 20  │
│ [Grant ▾] [⚙] [Revoke]        Active [●] │
└───────────────────────────────────────────┘
```

### Admin Header with Sticky KPIs
```text
┌─ Admin Panel ──────────── [Admin] ─┐
│ 6,666 Users │ 42 Paid │ ₹12.5K    │
├────────────────────────────────────┤
│ [Users] [Analytics] [Plans] ...    │
```

