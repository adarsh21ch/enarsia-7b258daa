

# Fix: Admin Panel Changes Not Syncing to Website Funnels

## Problem Diagnosis

There are three separate issues preventing the admin panel changes from affecting the website funnels:

### Issue 1: No Users Have Funnels Pro Status
The `user_funnel_subscriptions` table is **completely empty**. Even though you created a "Funnels Pro" plan in `admin_subscription_plans` and configured feature flags, no user has actually been assigned Pro status. The feature gate (`useFunnelFeatureAccess`) checks this table to determine if a user is Pro or Free.

### Issue 2: No Payment Flow Connected
The "Funnels Pro" plan exists in `admin_subscription_plans` with a Razorpay link, but the payment webhook (`razorpay-webhook` edge function) needs to handle `plan_scope = 'funnels'` to insert rows into `user_funnel_subscriptions` when payment is confirmed.

### Issue 3: Website is a Separate Frontend
The website (nevorai.com) shares the same database but is a **separate codebase**. It must have its own implementation of the `useFunnelSubscription` and `useFunnelFeatureAccess` hooks. If those hooks don't exist on the website side, the website won't enforce any of the feature gates you configure in the admin panel.

```text
Admin Panel                      Database                        Website / App
+-----------------------+        +-------------------------+     +---------------------+
| Toggle free/pro flags | -----> | admin_feature_flags     | <-- | useFunnelFeature-   |
| in Funnels tab        |        | (data IS saved OK)      |     | Access() reads this |
+-----------------------+        +-------------------------+     +---------------------+

+-----------------------+        +-------------------------+     +---------------------+
| Grant Pro button in   | -----> | user_funnel_subscriptions| <-- | useFunnelSubscription|
| Subscribers table     |        | (currently EMPTY)       |     | () reads this       |
+-----------------------+        +-------------------------+     +---------------------+

+-----------------------+        +-------------------------+
| Create "Funnels Pro"  | -----> | admin_subscription_plans|
| plan with price       |        | (plan exists, ₹499)     |
+-----------------------+        +-------------------------+
```

## What Needs to Happen

### Step 1: Seed a Funnel Subscription for Testing
Insert a test row into `user_funnel_subscriptions` for your admin user so you can verify the feature gates actually work when a user has Pro status.

### Step 2: Fix the FunnelsSubscribersTable "Grant Pro" Flow
Currently the "Grant Pro" button in the admin panel does `.update()` on `user_funnel_subscriptions` -- but if the user doesn't already have a row in that table, the update affects zero rows. It should use **upsert** (insert-or-update) instead.

### Step 3: Ensure the Website Has Matching Hooks
The website (nevorai.com) must implement the same `useFunnelSubscription` and `useFunnelFeatureAccess` hooks that this app has. Since the website is a separate project, these hooks need to be copied/integrated there. This is outside the scope of this app's codebase -- it requires changes on the website project.

## Technical Changes (This App)

### File: `src/components/admin/FunnelsSubscribersTable.tsx`

**Change the "Grant Pro" handler** from `.update()` to `.upsert()` so it works even when the user doesn't have an existing row:

```typescript
const handleGrant = async (sub: any) => {
  try {
    const { error } = await supabase
      .from('user_funnel_subscriptions')
      .upsert({
        user_id: sub.user_id,
        status: 'active',
        plan: 'pro',
        is_admin_override: true,
      }, { onConflict: 'user_id' });
    if (error) throw error;
    // ... rest of audit logging
  }
};
```

**Add an "Add User" button** that lets admins grant Funnels Pro to any user (not just those already in the table), since the table starts empty.

### File: `src/components/admin/FunnelsSubscribersTable.tsx`

**Fix the query** to also show users who DON'T have a funnel subscription yet (from `profiles` table) so the admin can grant Pro to anyone, not just existing subscribers.

## Summary

| What | Status | Fix |
|---|---|---|
| Feature flags saved to DB | Working | No change needed |
| User funnel subscriptions | Empty table, Grant button uses update (fails on no rows) | Switch to upsert, add "Add User" |
| Website reading flags | Requires separate website code changes | Outside this app's scope |
| Payment webhook for funnels | Needs `plan_scope = 'funnels'` handling | Check/update edge function |

