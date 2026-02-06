

# Calling Streak / Daily Activity Streak

## Overview

Track consecutive active days for each user to boost daily retention. A day counts as active if the user adds/imports leads, makes calls, or updates tracking. The streak displays as a fire icon in the Calling tab header, with admin controls for configuration.

---

## 1. Database: New Tables and Config

### `user_daily_activity` table

Stores one record per user per day to track activity without scanning full history.

| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| user_id | UUID NOT NULL | |
| activity_date | DATE NOT NULL | |
| has_activity | BOOLEAN DEFAULT false | |
| activity_sources | TEXT[] DEFAULT '{}' | Array: 'manual_add', 'import', 'call', 'tracking_update' |
| created_at | TIMESTAMPTZ | |

Unique constraint on `(user_id, activity_date)`.

### `user_streaks` table

Maintains precomputed streak state per user (no full-history scans).

| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| user_id | UUID UNIQUE NOT NULL | |
| current_streak | INTEGER DEFAULT 0 | |
| longest_streak | INTEGER DEFAULT 0 | |
| last_active_date | DATE | |
| grace_used | INTEGER DEFAULT 0 | |
| updated_at | TIMESTAMPTZ | |

### Admin Config Rows

Insert into `admin_usage_limits`:

| config_key | config_value | description |
|---|---|---|
| streak_enabled | 1 | Enable/disable streak feature |
| streak_grace_days | 1 | Number of grace days before reset |

Insert into `admin_config_text`:

| config_key | config_value | description |
|---|---|---|
| streak_active_actions | manual_add,import,call,tracking_update | Comma-separated actions that count |

### RLS Policies

- `user_daily_activity`: Users can read/insert/update their own rows (`auth.uid() = user_id`)
- `user_streaks`: Users can read/insert/update their own rows (`auth.uid() = user_id`)

---

## 2. New Hook: `useStreak`

**File:** `src/hooks/useStreak.ts`

Responsibilities:
- Fetch `user_streaks` row for current user (create if missing)
- Fetch admin config for `streak_enabled`, `streak_grace_days`, and `streak_active_actions`
- Expose: `currentStreak`, `longestStreak`, `lastActiveDate`, `streakEnabled`, `loading`
- Provide `recordActivity(source: string)` function that:
  1. Upserts into `user_daily_activity` for today (adds source to `activity_sources` array, sets `has_activity = true`)
  2. Recalculates streak: if `last_active_date` is yesterday (or within grace), increment `current_streak`; if today already recorded, no-op; if gap exceeds grace, reset to 1
  3. Updates `user_streaks` row with new values
- All streak math is done client-side on the single `user_streaks` row (no history scan)

### Streak Calculation Logic

```text
today = current date
gap = daysBetween(last_active_date, today)

if gap == 0: already active today, no change
if gap == 1: consecutive day, streak += 1, grace_used = 0
if gap <= 1 + grace_days: within grace, streak += 1, grace_used = gap - 1
if gap > 1 + grace_days: streak reset to 1, grace_used = 0

Update longest_streak = max(longest_streak, current_streak)
Update last_active_date = today
```

---

## 3. Integrate Activity Recording

Record streak activity at existing action points (no new UI, just hook calls):

- **`src/hooks/useProspectsQuery.ts`** (or wherever `addProspect` / `importProspects` resolves): call `recordActivity('manual_add')` or `recordActivity('import')`
- **`src/components/prospects/CallResultModal.tsx`**: after saving a call result, call `recordActivity('call')`
- **`src/components/tracking/DynamicLeadsTracker.tsx`** and **`DynamicFunnelTracker.tsx`**: when user saves today's tracking data, call `recordActivity('tracking_update')`

Each call is a lightweight upsert (idempotent for the same day).

---

## 4. Streak Badge in Dashboard Header

**File:** `src/pages/Dashboard.tsx`

- Import `useStreak`
- In the header row (next to "Calling" title or near `HeaderBellIcon`), render a streak badge:

```text
[fire emoji] [number]
```

- Wrap in a `Tooltip` (from existing `@radix-ui/react-tooltip`):
  - Content: "You're on a {N}-day streak! Keep going by adding leads or making calls daily."
  - If streak is 0: "Start your streak by being active today!"

- Only render if `streakEnabled` is true from admin config
- On missed day (grace period active), show a subtle warning text below the badge: "Don't break your streak!"

---

## 5. Streak History (Pro Only)

**File:** `src/components/tracking/StreakHistory.tsx` (new, optional)

- Simple card showing streak history from `user_daily_activity` (last 30 days calendar heatmap or list)
- Gated: only visible if `isPro` from `useSubscription`
- Free users see: "Upgrade to Pro to view your streak history and consistency insights" with upgrade CTA
- This component can be placed in the Tracking page or Profile page

---

## 6. Admin Panel: Streak Settings

**File:** `src/components/admin/UsageLimitsManager.tsx`

Add to `LIMIT_CATEGORIES`:

```text
'Streak Settings': ['streak_enabled', 'streak_grace_days']
```

Add to `LIMIT_ICONS`:

```text
streak_enabled: <Flame icon />
streak_grace_days: <Clock icon />
```

Add `streak_enabled` to `BOOLEAN_FIELDS` array (shows toggle instead of number input).

### Action Scope Checkboxes

Add a new section (similar to `HistoricalScopeManager`) called `StreakActionsManager`:
- Reads/writes `streak_active_actions` from `admin_config_text`
- Checkboxes for: Manual Add, Import, Call, Tracking Update
- Save button appears on change

### Admin User Streak Reset

In `EnhancedUsersTab` or `UserOverrideDrawer`:
- Add a "Reset Streak" button per user
- On click: sets `current_streak = 0`, `grace_used = 0`, `last_active_date = null` in `user_streaks`
- Logs action to audit log

---

## 7. Files Summary

| Action | File |
|---|---|
| Create | `supabase/migrations/[timestamp].sql` (tables + config rows + RLS) |
| Create | `src/hooks/useStreak.ts` |
| Create | `src/components/tracking/StreakHistory.tsx` |
| Edit | `src/pages/Dashboard.tsx` (streak badge in header) |
| Edit | `src/components/admin/UsageLimitsManager.tsx` (streak settings + actions manager) |
| Edit | `src/components/prospects/CallResultModal.tsx` (record 'call' activity) |
| Edit | `src/hooks/useProspectsQuery.ts` (record 'manual_add' / 'import' activity) |
| Edit | `src/components/tracking/DynamicLeadsTracker.tsx` (record 'tracking_update') |
| Edit | `src/components/tracking/DynamicFunnelTracker.tsx` (record 'tracking_update') |
| Edit | `src/components/admin/EnhancedUsersTab.tsx` or `UserOverrideDrawer.tsx` (reset streak button) |

---

## Technical Details

### Performance
- Streak is precomputed in `user_streaks` -- no history scans
- `recordActivity` is a single upsert + single update per action (idempotent per day)
- Admin config is cached via existing `useAdminConfig` with 30s stale time

### Independence
- Streak tables are fully independent from `daily_tracking_log`, `activity_logs`, and analytics tables
- No foreign keys to tracking tables -- only `user_id` references

### Grace Day Warning
- When `grace_used > 0` (user is in grace period), the badge tooltip shows: "You missed a day! Stay active to keep your streak."
- This is a soft warning, not blocking

### Admin as Source of Truth
- `streak_enabled` toggle controls whether the feature is active at all
- `streak_active_actions` controls which actions count
- Changes reflect immediately via existing cache invalidation on `admin-config` query key

