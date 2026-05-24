
# Goal

Move every pricing, offer, trial and subscription decision out of frontend code and into the admin panel + database. Add first-month introductory pricing (e.g. ₹59 first month → ₹149/month renewals) as a first-class, admin-controlled concept. Harden the Razorpay recurring flow so the discount + auto-renew works without manual touch. Restructure the admin panel so Plans is a top-level section.

---

## 1. Admin panel restructure

`src/components/admin/` and `src/pages/Admin.tsx`

- Tabs become: **Overview | Users | Plans | Revenue | Manage | Broadcast**.
- New `PlansTab.tsx` wraps `PlansManager` + `OffersManager` + `PlanSequenceControl`.
- `RevenueTab` strips out plan editing — it keeps only revenue analytics, payment history, refunds, MRR/ARR, churn.
- `ManageTab` stays as Limits / Features / Audit / Recovery.

## 2. Plans schema additions (admin_subscription_plans)

Add admin-controllable columns so frontend never hardcodes anything:

```text
monthly_price_inr        int  null   -- canonical monthly price
yearly_price_inr         int  null   -- canonical yearly price
first_month_price_inr    int  null   -- intro: charged on first cycle only
renewal_price_inr        int  null   -- recurring price from cycle 2+
trial_days               int  default 0
offer_badge_text         text null   -- e.g. "Launch Offer"
is_popular               boolean default false
is_free                  boolean default false
billing_cycle            text  default 'monthly'  -- monthly|yearly|one_time
cancel_anytime           boolean default true
highlight_savings_text   text  null   -- e.g. "Save ₹1080/yr"
```

Keep `price_inr` for backward compat, derived from monthly/yearly at write time.

## 3. Subscription state model

Extend `user_subscriptions` (and `user_funnel_subscriptions`) with:

```text
plan_id                    uuid   references admin_subscription_plans
subscription_status        text   check in ('active','trial','expired','canceled','pending','failed','grace_period')
first_payment_amount       int
renewal_amount             int
next_billing_date          timestamptz
billing_cycle              text
razorpay_subscription_id   text
payment_history            jsonb  default '[]'
```

A `subscription_events` table logs every webhook event (idempotency key = `razorpay_event_id`) to prevent duplicate payment processing.

## 4. Razorpay flow

Edge functions:

- `create-razorpay-subscription` — reads plan from DB, uses `razorpay_plan_id` for the **renewal** price (₹149). First-cycle discount is applied via Razorpay `addons` / `offer_id` for the first invoice only. Returns `subscription_id` + key.
- `razorpay-webhook` — handles `subscription.authenticated`, `subscription.activated`, `subscription.charged`, `subscription.pending`, `subscription.halted`, `subscription.cancelled`, `payment.failed`. All writes are idempotent via `subscription_events.razorpay_event_id` unique index. Moves users into `grace_period` on `subscription.pending`, `expired` after halted retries, `active` on `charged`.
- Recovery: a daily `auto-expire-subscriptions` job already exists — extend it to honor `next_billing_date` + `grace_period`.

The frontend never knows ₹59 vs ₹149 — it just renders strings derived from the plan row.

## 5. Frontend rendering (pure read)

A single helper `src/lib/planPricing.ts`:

```ts
formatIntroPricing(plan) -> {
  primary: "₹59 for first month",
  secondary: "Then renews at ₹149/month",
  badge: plan.offer_badge_text,
  popular: plan.is_popular,
}
```

All upgrade UI (`UpgradeModal`, `UpgradeCard`, `TierCard`, `UpgradeDrawer`, `ProLimitModal`, `FunnelsUpgradeDrawer`) is refactored to consume this helper. No `₹` literal, no plan name, no trial-day number, no feature list lives in JSX — only `{plan.xxx}` bindings.

`useAdminConfig` already loads plans; expose `getPlan(planKey)` and `getActivePlans({ scope, billing_cycle })`.

## 6. UpgradeModal polish

Render dynamically from plan row:

- Offer badge (top-left) = `plan.offer_badge_text`
- "Most Popular" pill = `plan.is_popular`
- Price block = `formatIntroPricing(plan)`
- "Cancel anytime" line shown when `plan.cancel_anytime`
- "Secure payment via Razorpay" footer (static brand line, OK to hardcode)
- Savings highlight = `plan.highlight_savings_text`

Teal design tokens already in `index.css` — no color changes needed beyond reusing `--primary`.

## 7. Migration + admin UI

- One migration: schema additions + indexes + `subscription_events` table + RLS (admins manage plans/events; users read their own subscription only).
- `PlansManager.tsx` form gains: monthly, yearly, first-month, renewal, trial days, billing cycle, badge text, popular toggle, cancel-anytime, savings text, free toggle, feature list editor, sort order, active toggle. Delete + duplicate buttons. Live preview card showing exactly what users will see.

## 8. Out of scope (explicit)

- No new visual theme work beyond the existing teal system.
- No new animations.
- No frontend-side trial-extension or coupon logic — coupons map to `first_month_price_inr` on a plan row.
- KYC, notes, funnels modules untouched.

---

## Technical notes

- Migration touches: `admin_subscription_plans`, `user_subscriptions`, `user_funnel_subscriptions`, new `subscription_events`. Existing rows backfilled (`renewal_price_inr := price_inr`, `billing_cycle` inferred from `duration_days`).
- Webhook idempotency: `unique(razorpay_event_id)` + `ON CONFLICT DO NOTHING` before any business write.
- First-month discount strategy on Razorpay: use a 1-cycle `offer` attached at subscription creation when `first_month_price_inr < renewal_price_inr`. Falls back to `addons` with negative amount if offer is not configured.
- Frontend gating already uses `admin_feature_flags` — keep that. Plan-driven limits stay in `admin_limits_tiered`.
- All currency stored as integer paise/rupees consistently with existing `price_inr` (rupees).

## Rollout

1. Migration approved.
2. Backend: edge functions + webhook update + types regenerated.
3. Admin: tab restructure + Plans form.
4. Frontend: swap hardcoded copy for plan-driven rendering, modal polish.
5. Manual QA in Razorpay sandbox: ₹59 first charge → ₹149 second cycle.
