

# Revamp TierCard Pricing to Emphasize Daily Cost

## What Changes
Modify `src/components/subscription/TierCard.tsx` — UI only, no logic changes.

## Current State
Each billing option button shows: duration label → **₹X** (monthly price, large) → `/mo` → `₹Y total`

## New Layout Per Billing Button

```text
┌─────────────────┐
│   6 Months      │  ← duration label (small)
│  Only ₹3/day    │  ← PRIMARY: large, bold, colored
│ ₹499 billed     │  ← secondary: small, muted
│ every 6 months  │
│  [Best Value]   │  ← badge if present
└─────────────────┘
```

## Key Changes in `TierCard.tsx`

1. **Add `getDailyPrice` helper**: `Math.ceil(plan.price / plan.durationDays)` to compute daily cost

2. **Add `getBillingLabel` helper**: Returns human-readable billing period:
   - 1 month → "billed monthly"
   - 6 months → "billed every 6 months"  
   - 12 months → "billed yearly"

3. **Restructure each billing button's content**:
   - Duration label stays at top (small, muted)
   - **"Only ₹X/day"** becomes the hero text — `text-lg font-bold` with accent color (primary for Basic, amber for Pro)
   - **"₹Y billed monthly/every 6 months/yearly"** below in `text-[9px] text-muted-foreground`
   - Badge text remains at bottom

4. **No changes** to: features list, tier header, card borders, selection logic, props, or any other component

## Files
- **Edit**: `src/components/subscription/TierCard.tsx`

