

# Separate Achievers Club Users from Nevorai Users in Admin KPIs

## Problem
Currently, the admin dashboard KPIs (Total Users: 6,429, Free Users: 6,392, etc.) include **both** Nevorai and Achievers Club users. The database shows 4,108 Nevorai users and 2,264 Achievers Club users, inflating the numbers. You need accurate Nevorai-only metrics.

## What Changes

The following KPIs and lists will be updated to only count **Nevorai users** (users with `product = 'nevorai'` in the `user_products` table):

| KPI / Feature | Current (all users) | After fix (Nevorai only) |
|---|---|---|
| Total Users | ~6,429 | ~4,108 |
| Free Users | ~6,392 | Recalculated |
| Conversion Rate | 0.82% | Recalculated |
| Subscription Pie Chart | Includes AC users | Nevorai only |
| Free Users list (drawer) | All free users | Nevorai only |
| Cohort Analysis | All signups | Nevorai only |
| Churn Risk Alerts | All users | Nevorai only |
| Trial Analytics | All users | Nevorai only |

**Already correct** (no changes needed): DAU, WAU, Today Active, Lead Importers, Active Callers, Total Leads -- these already filter by `app = 'neverai'` via `user_app_access`.

## Technical Details

### 1. Update Database Functions (SQL Migrations)

**a) `admin_get_conversion_analytics`** -- Add `JOIN user_products` filter:
```sql
FROM profiles p
JOIN user_products up ON up.user_id = p.user_id AND up.product = 'nevorai'
LEFT JOIN user_subscriptions us ON us.user_id = p.user_id
```

**b) `admin_get_free_users_paginated`** -- Add `JOIN user_products` filter so the free users list and count exclude Achievers Club-only users.

**c) `admin_get_signup_cohort_analytics`** -- Add `JOIN user_products` filter in the cohorts CTE.

**d) `admin_get_churn_risk_users`** -- Add `JOIN user_products` filter in the user_risk CTE.

**e) `admin_get_trial_analytics`** -- Add `JOIN user_products` filter to all CTEs.

### 2. Update Frontend Hook (`useAdminAnalytics.ts`)

**a) Total signups query** -- Change from counting all `profiles` to counting only profiles that have a `user_products` entry with `product = 'nevorai'`:
```ts
supabase.rpc('admin_get_nevorai_user_count')
```
(Or use a simple filtered query joining profiles with user_products.)

**b) Subscription breakdown query** -- Filter `user_subscriptions` to only include users who are in `user_products` with `product = 'nevorai'`.

### 3. New RPC Function

Create `admin_get_nevorai_user_count` to return the count of Nevorai-only users for the Total Users KPI, replacing the unfiltered `profiles` count.

## Files to Modify
- **SQL Migration**: Update 6 RPC functions to filter by `user_products.product = 'nevorai'`
- **`src/hooks/useAdminAnalytics.ts`**: Update `totalSignups` and `subscriptionBreakdown` queries to filter by Nevorai product

