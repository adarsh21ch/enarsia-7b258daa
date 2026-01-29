

# Pricing Psychology: Use ₹49/month Instead of ₹50/month

## Goal
Change monthly price display to end in "9" for better conversion psychology. ₹49/month feels more attractive than ₹50/month.

## Technical Change

### File: `src/components/subscription/UpgradeDrawer.tsx`

**Current calculation (line ~195):**
```tsx
const monthlyPrice = months >= 1 ? Math.round(displayPrice / months) : displayPrice;
```

**New calculation:**
```tsx
// Use floor to get prices ending in 9 (e.g., 299/6 = 49.83 → 49)
const monthlyPrice = months >= 1 ? Math.floor(displayPrice / months) : displayPrice;
```

## Result

| Plan | Total | Calculation | Before | After |
|------|-------|-------------|--------|-------|
| Pro 6-Month | ₹299 | 299 ÷ 6 = 49.83 | ₹50/month | ₹49/month |
| Pro Monthly | ₹99 | 99 ÷ 1 = 99 | ₹99/month | ₹99/month |

## Why This Works
- Prices ending in 9 trigger "bargain" perception
- ₹49 vs ₹99 = "Less than half!" feeling
- Industry standard pricing psychology

## Summary
- **1 line change**: `Math.round` → `Math.floor`
- **File**: `src/components/subscription/UpgradeDrawer.tsx`

