

# Proactive AI Business Coach Upgrade

## Overview

Expand the existing Nevorai AI assistant into a proactive system that automatically monitors business data and delivers insights, alerts, and coaching via push notifications and in-app display. No changes to existing backend tables or tracking logic -- the AI reads from existing `personal_snapshot_v2`, `total_snapshot_v2`, `prospects`, and `profiles` tables.

## Architecture

```text
┌──────────────────────┐
│  AI Insights Settings │ (Profile page section)
│  - Manage trackers    │
│  - Toggle alerts      │
│  - Set notification   │
│    preferences        │
└──────────┬───────────┘
           │ stores config
           ▼
┌──────────────────────┐     ┌─────────────────────────┐
│ ai_tracker_configs   │     │ ai_insight_preferences  │
│ (metric, frequency,  │     │ (daily_snapshot, alerts, │
│  notify_time, active)│     │  coaching, team_summary) │
└──────────┬───────────┘     └────────────┬────────────┘
           │                              │
           ▼                              ▼
┌─────────────────────────────────────────────────────┐
│  Edge Function: ai-daily-insights                   │
│  (Scheduled via pg_cron, runs every hour)            │
│  - Check ai_tracker_configs for due notifications   │
│  - Read from existing snapshot/prospect tables      │
│  - Generate insights via Lovable AI                 │
│  - Send push notifications + store in-app           │
└─────────────────────────────────────────────────────┘
```

## Database Changes (2 new tables)

### 1. `ai_tracker_configs` -- user tracker subscriptions
- `id` uuid PK
- `user_id` uuid references auth.users NOT NULL
- `metric_type` text NOT NULL (e.g. 'leads_added', 'calls_made', 'videos_sent', 'follow_ups', 'positive_prospects', 'funnel_stages', 'team_updates', 'team_level_counts')
- `frequency` text NOT NULL DEFAULT 'daily' ('daily', 'weekly', 'monthly')
- `notify_hour` integer DEFAULT 20 (0-23, hour in IST)
- `is_active` boolean DEFAULT true
- `last_sent_at` timestamptz
- `created_at` timestamptz DEFAULT now()
- RLS: users can CRUD only their own rows

### 2. `ai_insight_preferences` -- global AI insight toggles
- `id` uuid PK
- `user_id` uuid references auth.users UNIQUE NOT NULL
- `daily_snapshot` boolean DEFAULT true
- `ai_alerts` boolean DEFAULT true
- `coaching_insights` boolean DEFAULT true
- `weekly_team_summary` boolean DEFAULT true
- `created_at` timestamptz DEFAULT now()
- RLS: users can CRUD only their own rows

## Frontend Changes

### 1. AI Insights Settings (new component: `src/components/ai/AIInsightsSettings.tsx`)
A drawer/sheet accessible from the Profile page (new card below the notification toggle, above Settings). Contains:

- **Daily Snapshot** toggle -- enable/disable automatic daily summary
- **AI Alerts** toggle -- enable/disable proactive alerts (team not updated, stuck prospects, activity drops)
- **Coaching Insights** toggle -- enable/disable weekly AI coaching tips
- **Team Summary** toggle (leaders only) -- weekly team performance summary
- **AI Trackers** section -- list of subscribed metrics with:
  - Add tracker button opening a form (metric selector, frequency selector, notification time picker)
  - Each tracker row shows metric name, frequency, toggle to enable/disable, delete

### 2. Profile Page (`src/pages/Profile.tsx`)
Add an "AI Insights" card with a Sparkles icon below the App Notifications card, opening the `AIInsightsSettings` drawer.

### 3. Enhanced AI Chat suggestions (`src/components/ai/AIAssistantChat.tsx`)
Update the SUGGESTIONS array to include proactive-style queries:
- "Daily snapshot"
- "Who hasn't updated today?"
- "Funnel analysis"
- "Coaching tips"
- "Team performance this week"

### 4. New hook: `src/hooks/useAIInsights.ts`
- Manages CRUD for `ai_tracker_configs` and `ai_insight_preferences`
- Provides `trackers`, `preferences`, `addTracker`, `updateTracker`, `deleteTracker`, `updatePreferences`

## Backend Changes

### 1. Enhanced AI system prompt (nevorai-ai edge function)
Add new tools to the existing tool-calling architecture:

- `get_team_tracking_status` -- who updated/didn't update tracking today
- `get_stale_prospects` -- prospects stuck in a funnel stage for X days
- `get_unattended_positive_prospects` -- positive prospects without recent follow-up
- `get_activity_trend` -- compare last 7 days vs prior 7 days to detect drops
- `get_daily_snapshot_summary` -- comprehensive daily stats formatted for notification
- `get_funnel_analysis` -- analyze funnel config + stage distribution with suggestions

Update the system prompt to include coaching personality and proactive analysis capabilities.

### 2. New Edge Function: `supabase/functions/ai-daily-insights/index.ts`
Scheduled function that:
1. Queries `ai_tracker_configs` for entries where `is_active = true` and notification is due (based on `frequency`, `notify_hour`, `last_sent_at`)
2. Queries `ai_insight_preferences` for users with `daily_snapshot = true`
3. For each due notification:
   - Reads from existing snapshot tables (no modifications)
   - Calls Lovable AI to generate a concise insight
   - Sends push notification via existing `send-push-notification` function
   - Stores the insight in `inbox_messages` table (existing) for in-app viewing
   - Updates `last_sent_at`

### 3. pg_cron schedule
Set up a cron job to invoke `ai-daily-insights` every hour to check for due notifications.

## Implementation Order

1. Create database tables (`ai_tracker_configs`, `ai_insight_preferences`) via migration
2. Create `useAIInsights` hook
3. Build `AIInsightsSettings` drawer component
4. Add AI Insights card to Profile page
5. Add new tools to `nevorai-ai` edge function (team tracking status, stale prospects, activity trends, funnel analysis, coaching)
6. Update AI chat suggestions
7. Create `ai-daily-insights` scheduled edge function
8. Set up pg_cron schedule

## Scope Boundaries
- All data is READ-ONLY from existing tables
- No changes to tracking logic, snapshot tables, or prospect management
- Push notifications use the existing `send-push-notification` infrastructure
- In-app notifications use the existing `inbox_messages` table

