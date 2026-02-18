

# Phase 1: Safe 3-Tier Subscription Migration

## ✅ COMPLETED

### Database Migration
- ✅ Added `premium` to `user_plan` enum
- ✅ Added `tier` column to `user_subscriptions` (backfilled)
- ✅ Added `tier` column to `user_funnel_subscriptions` (backfilled)
- ✅ Added `tier` column to `admin_subscription_plans`
- ✅ Added `required_tier` + `module` to `admin_feature_flags` (backfilled)
- ✅ Added `basic_value`, `pro_value`, `premium_value`, `module` to `admin_usage_limits`
- ✅ Updated `get_app_config` RPC with new fields (`limits_tiered`, `required_tier`, `module`, `tier`)

### Core Permission System
- ✅ `src/hooks/useAdminConfig.ts` — Added `SubscriptionTier`, `TieredLimit`, `meetsRequiredTier()`, `TIER_RANK`, updated interfaces and SAFE_DEFAULTS
- ✅ `src/hooks/useSubscription.ts` — Added `userTier`, `isPremium`, kept `isPro`/`isPaid` as backward-compat computed props
- ✅ `src/hooks/useFunnelSubscription.ts` — Added `funnelTier` export
- ✅ `src/hooks/useFeatureAccess.ts` — Tier-based access check with legacy fallback
- ✅ `src/hooks/useFunnelFeatureAccess.ts` — Tier-based check with legacy fallback
- ✅ `src/contexts/PermissionsContext.tsx` — Tier-based permissions with `userTier`, `isPro`, `isPremium`

### Admin Panel UI
- ✅ `src/components/admin/PlansManager.tsx` — Tier dropdown in form, tier badge on cards, grouped by tier
- ✅ `src/components/admin/FeatureFlagsManager.tsx` — Required Tier selector + Module selector (auto-syncs legacy booleans)
- ✅ `src/components/admin/UsageLimitsManager.tsx` — Updated `updateLimit` signature for tier values

---

## 🔲 REMAINING (Phase 4)

### Edge Functions
- 🔲 `supabase/functions/razorpay-webhook/index.ts` — Read `tier` from `admin_subscription_plans`, store in subscription upsert
- 🔲 `supabase/functions/create-razorpay-order/index.ts` — Include `tier` in order notes
- 🔲 `supabase/functions/create-razorpay-subscription/index.ts` — Include `tier` in subscription notes

---

## Backward Compatibility Guarantees

- `user_plan` enum: `free` and `pro` values untouched, `premium` added
- `free_access` / `pro_access` / `trial_access` columns: **kept** in `admin_feature_flags`
- Existing `config_value` column: **kept** in `admin_usage_limits`
- `plan` column in `user_subscriptions`: **kept** as-is, `tier` is a new parallel column
- All existing Pro users: `tier` backfilled to `'pro'`, no access change
- All existing Free users: `tier` backfilled to `'basic'`, no access change
- Webhook `payment.captured`: existing logic unchanged, `tier` defaults to `'pro'` if missing
- `isPro` and `isPaid` exports: kept as computed values from `tier`
