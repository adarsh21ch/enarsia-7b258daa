

# Restructure Upgrade UI: Two Tier Cards (Pro + Premium)

## Overview

Replace the current "flat list of plan cards" in both `UpgradeDrawer` and `FunnelsUpgradeDrawer` with a **two-card layout** grouped by tier. Each card (Pro / Premium) shows feature highlights at the top, duration options as selectable radio-style buttons inside, and a single "Upgrade Now" CTA.

No database, webhook, or subscription logic changes.

---

## Current State

- **UpgradeDrawer** (main app): Shows all plans as individual selectable cards (Pro Monthly, Pro 4 Months, Premium Monthly)
- **FunnelsUpgradeDrawer**: Separate drawer filtering for `funnels_` / `combined_` plan keys (now deleted) -- effectively broken
- **UpgradeModal**: Used for lead-limit prompts, shows primary + secondary plan cards

### Active Plans in Database

| plan_key | tier | price | duration | billing |
|---|---|---|---|---|
| monthly | pro | 99 | 30 days | recurring |
| pro_4_months | pro | 299 | 120 days | one_time |
| premium_recurring | premium | 499 | 30 days | recurring |

---

## New UI Structure

```text
+------------------------------------------+
| Unlock Pro Features                      |
| Choose a plan that works for you         |
+------------------------------------------+
|                                          |
| +--------------------------------------+ |
| | PRO                                  | |
| | Full Application Access              | |
| | TrackUp Dashboard                    | |
| | Higher limits                        | |
| | Productivity tools                   | |
| |                                      | |
| | ( ) 1 Month - Rs.99/mo  [recurring]  | |
| | (x) 4 Months - Rs.74/mo [Best Value] | |
| +--------------------------------------+ |
|                                          |
| +======================================+ |
| | PREMIUM  [Recommended for Leaders]   | |
| | Everything in Pro                    | |
| | Nevorai Funnels                      | |
| | Funnel Insights                      | |
| | Advanced analytics                   | |
| | Leader tools                         | |
| |                                      | |
| | (x) 1 Month - Rs.499/mo [recurring]  | |
| +======================================+ |
|                                          |
| [  Upgrade Now - Get Pro 4 Months Rs.299 ]|
| Secure payment via Razorpay              |
+------------------------------------------+
```

---

## Implementation Details

### 1. Rewrite `UpgradeDrawer.tsx` PlanContent

**Group plans by tier:**
- Fetch plans via `usePaymentLinks()` (no change to data layer)
- Group: `proPlans = plans.filter(p => p.tier === 'pro')`, `premiumPlans = plans.filter(p => p.tier === 'premium')`
- Ignore `basic` tier plans

**Tier Card component (`TierCard`):**
- Props: `tierName`, `plans[]`, `features[]`, `isPremium`, `selectedPlanKey`, `onSelectPlan`
- Header: tier name + feature highlights (hardcoded per tier or from first plan's features)
- Body: radio-style duration options for each plan in that tier
  - Shows: duration label, price, per-month calculation for multi-month, badge text
  - Clicking selects that plan_key
- Premium card gets: amber/gold border highlight, "Recommended for Leaders" badge, slightly different button color emphasis

**Selection state:**
- Single `selectedPlanKey` state across both cards
- Selecting a duration in either card deselects the other
- Bottom CTA button dynamically shows selected plan name + price

**Keep existing:**
- Coupon code section (unchanged)
- Payment handler logic (unchanged -- `handleUpgrade` with `initiatePayment` / `initiateSubscription`)
- Mobile Drawer vs Desktop Sheet pattern (unchanged)
- Trigger button variants (unchanged)

### 2. Update `FunnelsUpgradeDrawer.tsx`

Replace the entire content to reuse the same tier-card pattern:
- Remove dependency on `useFunnelSubscription` (use `useSubscription` instead)
- Show the same two tier cards (Pro + Premium)
- Premium card is pre-selected by default (since this is the funnel upgrade context)
- Keep the same Drawer/Sheet mobile/desktop pattern

### 3. Update `UpgradeModal.tsx`

Apply the same two-tier-card layout inside the modal dialog:
- Group plans by tier
- Show Pro and Premium as two cards with duration selectors
- Keep existing lead-limit messaging and CTA logic

### 4. Feature Highlights (Hardcoded per Tier)

**Pro:**
- Full Application Access (Calling + Follow-up)
- TrackUp Dashboard (Advanced Tracking)
- Higher Limits and Productivity Tools
- Faster Workflow and Automation

**Premium:**
- Everything in Pro
- Nevorai Funnels
- Funnel Videos Insights
- Advanced Analytics
- Leader Tools
- Premium Support

### 5. Visual Differentiation

- **Pro card**: Standard border (`border-border`), primary color accents
- **Premium card**: Gold/amber border (`border-amber-500/50`), subtle gradient background, "Recommended for Leaders" badge at top-right, amber-tinted CTA when selected

---

## Files to Modify

| File | Change |
|---|---|
| `src/components/subscription/UpgradeDrawer.tsx` | Rewrite PlanContent to use TierCard grouping with duration selectors |
| `src/components/subscription/UpgradeModal.tsx` | Same tier-card layout inside the modal |
| `src/components/funnels/FunnelsUpgradeDrawer.tsx` | Replace with unified tier cards, remove `useFunnelSubscription` dependency |

## Files NOT Modified

- `usePaymentLinks.ts` -- data layer stays the same
- `useSubscription.ts` -- no changes
- `useRazorpay.ts` -- no changes
- `useAdminConfig.ts` -- no changes
- Database schema -- no changes
- Edge functions -- no changes
- Webhook logic -- no changes

