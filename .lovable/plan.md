

# Fix Plan Creation Bug and Improve Feature Flags Module Grouping

## Issues Found

1. **Plan creation error** -- "duplicate key value violates unique constraint" occurs because the user tried creating a new Premium plan with `plan_key = 'monthly'`, which already exists. The form needs to validate uniqueness and auto-suggest unique keys.

2. **All feature flags have `module = 'application'`** -- The migration defaulted everything to `application`. Funnel-related features (like `funnel_create`, `funnel_video_upload`, etc.) need to be updated to `module = 'funnels'`.

3. **Feature flags UI doesn't group by module** -- Currently groups by category only (Calling, Leads, etc.), making it hard to see which features belong to Application vs Funnels.

---

## Fix 1: Plan Key Duplicate Prevention

**File: `src/components/admin/PlansManager.tsx`**

- When creating a new plan, auto-generate a unique `plan_key` based on tier and billing type (e.g., `premium_monthly`, `premium_yearly`)
- Show a validation error if the user manually enters a `plan_key` that already exists
- Display a user-friendly toast with the actual error ("A plan with this key already exists") instead of the generic "Failed to save plan"

## Fix 2: Update Funnel Feature Flags Module

**Database update (data fix, not schema):**

Update all feature flags with `category = 'funnels'` or `feature_key LIKE 'funnel_%'` to set `module = 'funnels'` instead of `'application'`.

Affected features:
- `funnel_create`, `funnel_advanced_analytics`, `funnel_custom_branding`
- `funnel_lead_export`, `funnel_max_funnels`, `funnel_max_leads`
- `funnel_price_options`, `funnel_qr_code`, `funnel_video_upload`
- `funnel_whatsapp_auto`, `funnel_analytics`

## Fix 3: Feature Flags UI -- Group by Module First, Then Category

**File: `src/components/admin/FeatureFlagsManager.tsx`**

- Primary grouping: **Module** (Application / TrackUp / Funnels) with clear section headers
- Secondary grouping: **Category** within each module
- Each module section gets a distinct header with a colored border/background
- This gives the admin a clear view of which features belong to which app

### Visual structure:
```text
--- APPLICATION ---
  Calling: [flags...]
  Leads: [flags...]
  Team: [flags...]
  
--- FUNNELS ---
  Funnels: [flags...]
```

---

## Files to Modify

| File | Change |
|---|---|
| `src/components/admin/PlansManager.tsx` | Add plan_key uniqueness validation, better error messages |
| `src/components/admin/FeatureFlagsManager.tsx` | Group by module first, then by category |
| Database (data update) | Set `module = 'funnels'` for funnel-related feature flags |
