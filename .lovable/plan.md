
# Nevorai — Onboarding, Retention & Growth Plan

## Phase 1: Signup Form — Add Phone Field
- Add WhatsApp Number field to Auth signup form (tel input, Indian format validation)
- Store as `+91XXXXXXXXXX` in profiles table
- Add `phone_number`, `signup_source`, `onboarding_completed`, `onboarding_step`, `whatsapp_popup_shown`, `whatsapp_community_joined`, `whatsapp_joined_at` columns to profiles
- Helper text: "We'll use this only to help you get started with Nevorai."

## Phase 2: Admin Users — Phone + New Signups View
- Show phone number, lead count, WA community status, last active in Users list
- Add call/WhatsApp/email action buttons per user
- Add "New Signups" sub-tab showing last 7 days with quick-action buttons
- Add filters: No Phone, Not in WA, Never Active
- Pre-filled WhatsApp message from founder

## Phase 3: Post-Signup WhatsApp Community Popup
- Full-screen bottom sheet after signup (once per user)
- WhatsApp group invite link with tracking
- "Maybe Later" skip option
- Store `whatsapp_popup_shown` and `whatsapp_community_joined` in profiles

## Phase 4: 100 Lead Limit + Enforcement UI
- Replace trial days with simple 100-lead free limit
- Warning banner at 80 leads, blocking sheet at 100 leads
- Update existing `useLeadLimit` / `useLifetimeLeadLimit` hooks
- Update admin panel to show "Free — 47/100 leads" instead of trial badges
- Note: Will work with existing lead limit infrastructure, not create duplicate systems

## Phase 5: Default Tags + Demo Leads on Signup
- Auto-create 5 default tags (Calling, Video Send, Hot Lead, Enrolled, Follow Up) for new users
- Create demo sheet with 3 demo leads marked `is_demo = true`
- Demo leads excluded from limits, auto-deleted after 7 days or onboarding completion

## Phase 6: Interactive Onboarding Flow (5 steps)
- Step 1: Welcome screen with user's first name
- Step 2: Show demo sheet + coach mark overlay
- Step 3: Guide user to tag a demo lead
- Step 4: Show activity history
- Step 5: Schedule a follow-up
- Progress bar, skip option after Step 2, state persistence

## Phase 7: Push Notification Sequences
- Sequence A: New user onboarding reminders (4h, Day 1, Day 3, Day 7)
- Sequence B: Lead limit nudges (50, 80, 100 leads)
- Sequence C: Re-engagement (3d, 7d, 14d dormant)
- Edge function cron jobs checking profiles.last_active

## Implementation Notes
- Will reuse existing infrastructure where possible (useLeadLimit, useFreeTrial, push notification system)
- Each phase will be implemented and verified before moving to next
- Database migration first, then code changes
- Phone number will be encrypted using existing encryption system
