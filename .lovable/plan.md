

# Update Admin Panel to Support 3-Tier System (Free / Basic / Pro)

## Context
The app has a 3-tier system internally: `basic` (Free), `pro` (Basic), `premium` (Pro). The `user_subscriptions` table has both a `plan` column (enum: free/pro) and a `tier` column (string: basic/pro/premium). The admin panel currently only shows Free/Pro and uses the old `plan` field. It needs to reflect the actual 3-tier naming and allow admins to grant Basic or Pro access.

## Changes

### 1. `src/components/admin/EnhancedUsersTab.tsx`
- **Filter dropdown**: Update `PLAN_FILTER_OPTIONS` to include `basic` and `premium` tiers instead of just `free`/`pro` (keep `funnels_pro`). Labels: "Free", "Basic", "Pro", "Funnels Pro".
- **User plan badge**: Replace the binary Free/Pro badge with tier-aware badges using `getTierDisplayName` from `tierLabels.ts`. Show crown icon for Basic, gem for Pro.
- **Grant actions**: Replace "Grant Pro..." dropdown with a two-step select: first pick tier (Basic/Pro), then duration. Simplify to a single "Grant Plan" select with options like "Basic 30d", "Basic 90d", "Pro 30d", "Pro 90d", etc.
- **Revoke button**: Change "Revoke Pro" to "Revoke Plan" — sets back to free/basic tier.
- **Trial badge**: Update condition `plan === 'pro'` to also check for `premium` tier.
- **handleGrantPro → handleGrantPlan**: Accept tier parameter alongside duration. Pass `tier` to the edge function.

### 2. `supabase/functions/admin-update-subscription/index.ts`
- Accept optional `tier` parameter in the request body (values: `basic`, `pro`, `premium`).
- Validate `tier` if provided.
- Include `tier` in the update/insert data alongside the existing `plan` field.
- When granting Basic (`tier: 'pro'`), set `plan: 'pro'`. When granting Pro (`tier: 'premium'`), set `plan: 'pro'`. When revoking, set `tier: 'basic'`, `plan: 'free'`.

### 3. `src/components/admin/SubscriptionPieChart.tsx`
- Add Basic tier color (blue/primary).
- Parse data to show Free / Active Basic / Active Pro / Expired segments.

### 4. `src/components/admin/UserOverrideDrawer.tsx`
- Rename "Force Pro Access" to "Force Plan Access" with a tier selector (Basic/Pro) instead of a simple toggle.

### 5. `src/hooks/useAdmin.ts`
- Update `UserWithSubscription` interface to include `tier` field.
- Update `updateUserSubscription` to accept and pass `tier` parameter.

### 6. Audit log messages
- Update log messages in EnhancedUsersTab to reflect the actual tier granted (e.g., "Granted Basic access" vs "Granted Pro access").

## Files to modify
- `src/components/admin/EnhancedUsersTab.tsx`
- `supabase/functions/admin-update-subscription/index.ts`
- `src/components/admin/SubscriptionPieChart.tsx`
- `src/components/admin/UserOverrideDrawer.tsx`
- `src/hooks/useAdmin.ts`

