
# Phase 2: Combined Plan Integration, Feature Gates, and Admin Panel

## What This Phase Covers

Phase 1 established the database, hooks, edge functions, and the FunnelsUpgradeDrawer. Phase 2 completes the system by:

1. Gating features in FunnelEditor and FunnelAnalytics pages
2. Fixing the existing UpgradeDrawer to exclude funnel/combined plans (it currently shows ALL plans)
3. Adding the combined plan option to the existing UpgradeDrawer (so app users see it too)
4. Updating PaymentSuccess page to handle funnel/combined plan confirmations
5. Adding Funnels subscription management to the Admin Panel

---

## Changes

### 1. Fix UpgradeDrawer -- filter out funnel-only plans, show combined plans

**File:** `src/components/subscription/UpgradeDrawer.tsx`

The existing UpgradeDrawer shows ALL plans from `admin_subscription_plans` with no filtering. This means funnel-only plans (`funnels_pro_monthly`) appear in the app upgrade flow, which is wrong.

- Filter `sortedPlans` to exclude plans starting with `funnels_` (keep `combined_` plans visible as a "Best Value" upsell)
- Combined plans get a special "App + Funnels" badge to differentiate from app-only plans

### 2. Gate features in FunnelEditor

**File:** `src/pages/FunnelEditor.tsx`

- Import `useFunnelFeatureAccess` and `FunnelsUpgradeDrawer`
- Gate the Price Options / multiple pricing section behind `funnel_price_options` feature flag
- Gate video upload behind `funnel_video_upload` feature flag (show Pro badge + upgrade prompt when limit reached)
- Show `FunnelsProBadge` on gated sections with an inline upgrade trigger

### 3. Gate advanced analytics in FunnelAnalytics

**File:** `src/pages/FunnelAnalytics.tsx`

- Import `useFunnelFeatureAccess` and `FunnelsUpgradeDrawer`
- Gate the detailed stats grid (completion rate, paid leads) behind `funnel_advanced_analytics`
- Free users see total leads count only; other stats show a blurred/locked overlay with upgrade prompt

### 4. Update PaymentSuccess page for funnel/combined plans

**File:** `src/pages/PaymentSuccess.tsx`

- After verification, check `plan_scope` from the response data
- Show different success messages based on scope:
  - `funnels`: "Funnels Pro Activated" with funnel-specific feature list
  - `combined`: "All-in-One Pro Activated" with both app + funnel features
  - Default: existing "Pro Plan Activated" message
- Also refetch `funnel-subscription` query when scope is `funnels` or `combined`

### 5. Update verify-razorpay-payment to return plan_scope

**File:** `supabase/functions/verify-razorpay-payment/index.ts`

- Include `plan_scope` in the success response so PaymentSuccess can determine what was purchased

### 6. Admin Panel -- Funnels Subscription Management

**File:** `src/components/admin/EnhancedUsersTab.tsx`

- Add a "Funnels Pro" filter option to the plan filter dropdown
- Show funnel subscription status (badge) alongside app subscription for each user
- Add "Grant Funnels Pro" action in the user override drawer

**File:** `src/components/admin/UserOverrideDrawer.tsx`

- Add a "Grant Funnels Pro" toggle that upserts `user_funnel_subscriptions` with `is_admin_override = true`

**File:** `src/components/admin/AdminAnalyticsDashboard.tsx`

- Add a small stats card showing: Total Funnels Pro users, Combined Pro users, Funnels revenue this month

---

## Technical Details

### UpgradeDrawer Plan Filtering Logic
```text
App UpgradeDrawer:
  Show: plans NOT starting with "funnels_"
  (monthly, pro_4_months, Pro_Yearly, combined_pro_monthly, combined_pro_yearly)

Funnels UpgradeDrawer (already done):
  Show: plans starting with "funnels_" or "combined_"
```

### FunnelEditor Gating Points
| Section | Feature Key | Free Behavior | Pro Behavior |
|---|---|---|---|
| Video Upload | `funnel_video_upload` | Limited uploads, show count + upgrade | Unlimited |
| Price Options Manager | `funnel_price_options` | Hidden, show locked card with upgrade | Full access |
| Custom Branding | `funnel_custom_branding` | N/A (future) | N/A (future) |

### FunnelAnalytics Gating
| Stat Card | Feature Key | Free Behavior | Pro Behavior |
|---|---|---|---|
| Total Leads | Always visible | Shows count | Shows count |
| Video Completed | `funnel_advanced_analytics` | Blurred with lock icon | Full access |
| Completion Rate | `funnel_advanced_analytics` | Blurred with lock icon | Full access |
| Paid Leads | `funnel_advanced_analytics` | Blurred with lock icon | Full access |

### PaymentSuccess Plan Scope Detection
The `verify-razorpay-payment` response will include `plan_scope: 'app' | 'funnels' | 'combined'` so the page can show the correct confirmation UI.

### Admin Funnels Pro Grant Flow
1. Admin opens user override drawer
2. Toggles "Grant Funnels Pro"
3. System upserts `user_funnel_subscriptions` with `plan: 'pro'`, `is_admin_override: true`, no expiry
4. Audit log entry created

---

## Files Summary

| File | Action |
|---|---|
| `src/components/subscription/UpgradeDrawer.tsx` | Modify (filter out funnels_ plans, style combined plans) |
| `src/pages/FunnelEditor.tsx` | Modify (add feature gates on price options, video upload) |
| `src/pages/FunnelAnalytics.tsx` | Modify (gate advanced stats behind feature flag) |
| `src/pages/PaymentSuccess.tsx` | Modify (handle funnels/combined plan scope in success UI) |
| `supabase/functions/verify-razorpay-payment/index.ts` | Modify (return plan_scope in response) |
| `src/components/admin/EnhancedUsersTab.tsx` | Modify (add Funnels Pro filter + badge) |
| `src/components/admin/UserOverrideDrawer.tsx` | Modify (add Grant Funnels Pro toggle) |
| `src/components/admin/AdminAnalyticsDashboard.tsx` | Modify (add funnels subscription stats) |
