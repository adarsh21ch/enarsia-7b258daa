

# Add "Funnels" Tab to Admin Panel with Feature Controls and New Feature Flags

## Overview

Add a dedicated "Funnels" tab to the Admin Panel that combines:
1. **KPI Stats** -- Total Creators, Funnels, Videos, Leads, Pro Users
2. **Funnel Feature Controls** -- Filtered view of funnel-category feature flags (same UI as the existing Features tab but showing only `category = 'funnels'` flags)
3. **Subscribers Management** -- List of Funnels Pro users with grant/revoke
4. **New Feature Flags** -- Additional funnel gates for more granular control

## New Feature Flags to Add

These will be inserted into `admin_feature_flags` with `category = 'funnels'`:

| Feature Key | Name | Description | Free Limit | Pro Limit |
|---|---|---|---|---|
| `funnel_max_leads` | Max Leads Per Funnel | Maximum leads a funnel can capture | 50 | unlimited |
| `funnel_qr_code` | QR Code Upload | Upload custom QR codes for payments | false (Pro Only) | true |
| `funnel_whatsapp_auto` | WhatsApp Auto Message | Auto-send WhatsApp message on lead capture | false (Pro Only) | true |
| `funnel_lead_export` | Export Funnel Leads | Export leads data from funnels | false (Pro Only) | true |

## Database Changes

Insert new feature flag rows via the data insert tool (no schema changes needed -- the `admin_feature_flags` table already exists).

## Frontend Changes

### 1. New Component: `AdminFunnelsTab.tsx`

Main tab component with sections:
- **Stats Grid** -- 6 KPI cards (Total Creators, Total Funnels, Total Videos, Total Leads, Funnels Pro Users, Combined Pro Users)
- **Feature Controls** -- Reuses the same card layout as `FeatureFlagsManager` but filtered to only show flags with `category = 'funnels'`. Includes the "Add Feature" button scoped to the funnels category.
- **Subscribers** -- Table of `user_funnel_subscriptions` rows with user info, plan status, expiry, and grant/revoke actions.

### 2. New Component: `FunnelsStatsGrid.tsx`

Fetches aggregated stats using client-side queries:
- `SELECT count(DISTINCT owner_user_id) FROM funnels` -- Total Creators
- `SELECT count(*) FROM funnels` -- Total Funnels
- `SELECT count(*) FROM video_assets` -- Total Videos
- `SELECT count(*) FROM funnel_leads` -- Total Leads
- `SELECT count(*) FROM user_funnel_subscriptions WHERE plan = 'pro'` -- Pro Users

### 3. New Component: `FunnelsFeaturesControl.tsx`

A focused version of FeatureFlagsManager that:
- Only shows flags where `category = 'funnels'`
- Uses the exact same toggle/limit UI (Power toggle, Free/Pro Only segmented control, Trial toggle, numeric limits)
- Supports adding new funnel-specific features
- Reuses the `useAdminFeatureFlags` hook with a category filter applied in the component

### 4. New Component: `FunnelsSubscribersTable.tsx`

Shows all users from `user_funnel_subscriptions` joined with `profiles`:
- Display name, email, plan, status, expiry, admin override badge
- "Grant Pro" / "Revoke Pro" action buttons
- Filter: All / Active / Expired / Admin Override

### 5. Modify: `Admin.tsx`

Add a "Funnels" tab trigger (with Video icon) between "Features" and "Support":
```
Users | Analytics | Plans | Offers | Limits | Features | Funnels | Support | Audit Log
```

## Files Summary

| File | Action |
|---|---|
| Database insert (new feature flags) | Insert 4 new rows into `admin_feature_flags` |
| `src/components/admin/AdminFunnelsTab.tsx` | Create -- main tab with sub-sections |
| `src/components/admin/FunnelsStatsGrid.tsx` | Create -- KPI cards |
| `src/components/admin/FunnelsFeaturesControl.tsx` | Create -- funnel-only feature flags manager |
| `src/components/admin/FunnelsSubscribersTable.tsx` | Create -- subscribers list with actions |
| `src/pages/Admin.tsx` | Modify -- add Funnels tab trigger and content |

## Component Structure

```text
Admin.tsx
  Tabs
    ...existing tabs...
    TabsContent value="funnels"
      AdminFunnelsTab
        +-- FunnelsStatsGrid (6 KPI cards)
        +-- FunnelsFeaturesControl (filtered feature flags with toggles/limits)
        +-- FunnelsSubscribersTable (user list with grant/revoke)
```
