

# Admin Panel Analytics & KPI Overhaul

## Root Cause: Pro Count = 0

The `admin_get_pro_users` RPC function **does not return `tier`** in its return type definition. It only returns `plan text`. So when the frontend does `u.tier === 'premium'`, it's always `undefined` — all 51 users land in "Basic", 0 in "Pro".

**Fix**: Alter the RPC to include `tier text` in its return columns, selecting `us.tier::text`.

## Plan

### 1. Fix `admin_get_pro_users` RPC — Add `tier` Column
- Create migration to `CREATE OR REPLACE FUNCTION admin_get_pro_users()` adding `tier text` to the return table
- Also include `status text` so we can filter expired/cancelled from the Paid KPI correctly
- The frontend `ProUser` interface already has `tier` — it just never gets populated

### 2. Fix Paid Count Logic in `EnhancedStatsGrid.tsx`
- Currently `activeProUsers` comes from `admin_get_analytics` which counts `plan = 'pro' AND status = 'active'` — this includes admin overrides with `status='free'` tier='basic' which are 6 users that won't match
- The Paid KPI sub-label `B:X P:Y` uses `useProUsers()` data filtered by `tier` — once the RPC returns tier, this will auto-fix
- Also filter out `is_expired` and `status='cancelled'` users from the paid count display

### 3. Upgrade Analytics KPI Grid — Compact & Information-Dense
Redesign `EnhancedStatsGrid` to show more data in less space:

**Row 1 (3 cols)**: Total Users | Paid (B:X P:Y) clickable | Free — same as now but tighter
**Row 2 (4 cols)**: DAU | WAU | MAU | Returning Rate%
**Row 3 (4 cols)**: Importers (today/wk) | Callers (today/wk) | New Signups (this month) | Conversion%
**Row 4 (4 cols)**: Total Leads | Today Leads | Revenue (total) | Expiring (7d) clickable

This adds MAU and Returning Rate to the top-level grid and moves conversion to a clearer "new signups this month → paid" framing.

### 4. Add Subscriber Health Section to Analytics
Create a new **"Subscribers" sub-tab** in the analytics tabs (or add to Retention tab):

- **Active vs Inactive Paid Users**: How many paid subscribers are actually using the app (opened in last 7 days vs dormant)
- **Renewal Tracking**: Count users who purchased a plan more than once (repeat buyers) — query `payments_log` for users with 2+ successful payments
- **Admin Override vs Organic**: Split paid users into "Paid via Razorpay" vs "Admin Granted" to clarify the 51 vs 37 discrepancy
- New RPC: `admin_get_subscriber_health()` returning active_paid, dormant_paid, repeat_buyers, admin_granted, organic_paid

### 5. Add `admin_get_subscriber_health` RPC (Migration)
```sql
-- Returns subscriber health metrics
CREATE OR REPLACE FUNCTION admin_get_subscriber_health()
RETURNS TABLE(
  total_paid bigint, active_paid bigint, dormant_paid bigint,
  admin_granted bigint, organic_paid bigint,
  repeat_buyers bigint, renewals_this_month bigint
)
```
- `active_paid`: paid users with `last_seen_at >= NOW() - 7 days`
- `dormant_paid`: paid users with `last_seen_at < NOW() - 7 days` or NULL
- `admin_granted`: paid users with `is_admin_override = true`
- `organic_paid`: paid users with `is_admin_override = false`
- `repeat_buyers`: users with 2+ successful payments in `payments_log`
- `renewals_this_month`: users who made a payment this month AND had a prior payment

### 6. Add MAU/Returning Rate to `useAdminAnalytics`
The retention analytics hook already fetches DAU/WAU/MAU but it's in a separate tab. Expose MAU and returning rate in the main analytics response so the KPI grid can show them without extra RPC calls. Add fields to `AdminAnalytics` interface.

### 7. Subscriber Health Card in Analytics Dashboard
Add a compact "Subscriber Health" card in the Overview or Retention tab:
- Horizontal bar: Active Paid vs Dormant Paid
- Badges: Admin Granted count, Organic Paid count
- Repeat Buyer count with percentage

## Files to Modify
1. **New migration**: Fix `admin_get_pro_users` RPC + create `admin_get_subscriber_health` RPC
2. `src/hooks/useAdminAnalytics.ts` — add tier to ProUser, add subscriber health hook, expose MAU in main analytics
3. `src/components/admin/EnhancedStatsGrid.tsx` — 4-row compact grid, fix tier filtering
4. `src/components/admin/AdminAnalyticsDashboard.tsx` — add Subscribers tab or section
5. New: `src/components/admin/SubscriberHealthCard.tsx` — subscriber health visualization

