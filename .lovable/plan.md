

# Plan: Fix Upgrade Button Tab Visibility and Dynamic Tier Badges

## Bug 1: "Upgrade Now" not showing on admin-selected tabs

**Root Cause**: The `UpgradeButton` component is only rendered in `Profile.tsx`. The other pages (Dashboard, ListUp, TodoUp, Tracking) don't include it at all. The admin's "Trial Banner Visibility" checkboxes only control the `TrialBanner`, not the upgrade prompt.

**Fix**: Add the `UpgradeButton` component to all four pages (Dashboard, ListUp, TodoUp, Tracking), using the same `allowedTabs` mechanism from `useFreeTrial` to control visibility. The `UpgradeButton` will check the admin's tab whitelist before rendering.

Changes:
- **`src/components/subscription/UpgradeButton.tsx`**: Add a `tabId` prop. Fetch `allowedTabs` from `useFreeTrial` and hide the button if the tab isn't in the allowed list.
- **`src/pages/Dashboard.tsx`**: Import and render `<UpgradeButton tabId="dashboard" variant="prominent" />` for non-paid users.
- **`src/pages/ListUp.tsx`**: Same with `tabId="listup"`.
- **`src/pages/TodoUp.tsx`**: Same with `tabId="todoup"`.
- **`src/pages/Tracking.tsx`**: Same with `tabId="tracking"`.

## Bug 2: Hardcoded "Pro" badge in Tracking Settings

**Root Cause**: `TrackingSettingsDialog.tsx` shows a hardcoded `Pro` text in the badge for gated features, even though the admin has set `personal_auto_tracking` to require the "Basic" tier (internal `pro`).

**Fix**: Read the `required_tier` from the feature flag and display the correct user-facing tier name using `getTierDisplayName()`.

Changes:
- **`src/components/trackup-v2/TrackingSettingsDialog.tsx`**:
  - Import `useAdminConfig` and `getTierDisplayName` 
  - Look up `config.features['personal_auto_tracking']?.required_tier` and `config.features['total_auto_tracking']?.required_tier`
  - Replace hardcoded `Pro` text with `getTierDisplayName(required_tier)` (e.g., shows "Basic" when tier is `pro`, "Pro" when tier is `premium`)

## Summary of file changes

| File | Change |
|------|--------|
| `UpgradeButton.tsx` | Add `tabId` prop, check `allowedTabs` |
| `Dashboard.tsx` | Add `UpgradeButton` with `tabId="dashboard"` |
| `ListUp.tsx` | Add `UpgradeButton` with `tabId="listup"` |
| `TodoUp.tsx` | Add `UpgradeButton` with `tabId="todoup"` |
| `Tracking.tsx` | Add `UpgradeButton` with `tabId="tracking"` |
| `TrackingSettingsDialog.tsx` | Dynamic tier badge from feature flag |

No database changes needed.

