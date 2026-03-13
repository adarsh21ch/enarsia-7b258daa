

# Push Notifications Implementation Plan

## Overview
Add Web Push Notifications to the app with:
1. A **Notifications toggle** in the Profile page (above Settings)
2. An **Admin Notifications panel** to send push notifications to all app users

## Architecture

```text
┌─────────────────┐     ┌──────────────────┐     ┌─────────────┐
│  Profile Page    │     │  Admin Panel      │     │  Service    │
│  (Toggle ON/OFF) │     │  (Send Notif Tab) │     │  Worker     │
└───────┬─────────┘     └───────┬──────────┘     └──────┬──────┘
        │ save subscription      │ invoke edge fn        │ show notif
        ▼                        ▼                       ▼
┌─────────────────────────────────────────────────────────────────┐
│  push_subscriptions table (user_id, endpoint, p256dh, auth)    │
│  admin_notifications table (title, body, sent_at, sent_by)     │
└─────────────────────────────────────────────────────────────────┘
        │                        │
        ▼                        ▼
┌─────────────────────────────────────────┐
│  Edge Function: send-push-notification  │
│  - Reads push_subscriptions             │
│  - Sends via Web Push API (web-push)    │
└─────────────────────────────────────────┘
```

## Database Changes (2 tables + 1 migration)

**1. `push_subscriptions`** — stores each user's browser push subscription
- `id` uuid PK
- `user_id` uuid references auth.users
- `endpoint` text NOT NULL
- `p256dh` text NOT NULL
- `auth_key` text NOT NULL
- `created_at` timestamptz
- `unique(user_id, endpoint)`
- RLS: users can INSERT/DELETE/SELECT their own rows only

**2. `admin_notifications`** — log of sent notifications
- `id` uuid PK
- `title` text NOT NULL
- `body` text NOT NULL
- `sent_by` uuid references auth.users
- `recipient_count` integer
- `created_at` timestamptz
- RLS: admin can INSERT/SELECT; regular users no access

## Service Worker Update (`public/sw.js`)
- Add `push` event listener to display notifications
- Add `notificationclick` event listener to open the app

## VAPID Keys
- Need to generate VAPID key pair and store:
  - **Public key**: in codebase (env or constant) for client subscription
  - **Private key**: as a secret for the edge function
- Will use `secrets--add_secret` tool for the private key

## Frontend Changes

### 1. Profile Page (`src/pages/Profile.tsx`)
- Add a "Notifications" card with a Switch toggle **above the Settings collapsible**
- On toggle ON: request browser permission → subscribe via `pushManager.subscribe()` → save subscription to `push_subscriptions` table
- On toggle OFF: unsubscribe → delete from table
- Check existing subscription on mount to set initial toggle state

### 2. New Hook: `src/hooks/usePushNotifications.ts`
- `isSupported` — checks if browser supports push
- `isSubscribed` — checks DB for current subscription
- `subscribe()` / `unsubscribe()` — manage push subscription
- Handles permission request flow

### 3. Admin Panel — New "Notify" Tab (`src/components/admin/AdminNotificationsPanel.tsx`)
- Simple form: Title + Body + "Send to All" button
- Calls edge function `send-push-notification`
- Shows history of sent notifications from `admin_notifications` table

### 4. Admin Page (`src/pages/Admin.tsx`)
- Add new "Notify" tab with Bell icon in the tabs list

## Edge Function: `supabase/functions/send-push-notification/index.ts`
- Accepts `{ title, body }` from admin
- Validates admin role via `has_role` check
- Reads all subscriptions from `push_subscriptions`
- Sends Web Push using the `web-push` library (or raw fetch to push endpoints)
- Logs to `admin_notifications`
- Returns count of successful sends

## Implementation Order
1. Generate VAPID keys and add secret
2. Create database tables via migration
3. Update service worker with push/click handlers
4. Create `usePushNotifications` hook
5. Add notification toggle to Profile page
6. Create admin notifications panel
7. Create edge function for sending notifications
8. Add Notify tab to Admin page

