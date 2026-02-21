

# Internal Lead Sharing - Phase 1

## Overview
Add the ability for users to share selected leads with their direct team members (Layer 1) inside the app. Receivers can view and manually import shared leads into their own Calling tab.

## Database Changes

### New Table: `shared_leads`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid (PK) | Auto-generated |
| sender_id | uuid (NOT NULL) | References auth.users |
| receiver_id | uuid (NOT NULL) | References auth.users |
| lead_data | jsonb (NOT NULL) | Snapshot of lead details (name, phone, address, etc.) at share time |
| status | text (default 'pending') | pending / imported |
| created_at | timestamptz | Default now() |
| imported_at | timestamptz | Null until imported |

**Why `lead_data` (jsonb) instead of `lead_ids` (array)?**
- Leads belong to the sender. Storing IDs would require cross-user RLS access.
- A snapshot approach is cleaner: the sender's data is copied at share time, and the receiver imports from the snapshot. This avoids complex join-based RLS and ensures the sender's original data is never affected.
- Each row = one share batch (one sender to one receiver, with an array of leads inside the jsonb).

### RLS Policies
- **SELECT**: Sender or receiver can read their own rows (`sender_id = auth.uid() OR receiver_id = auth.uid()`)
- **INSERT**: Only authenticated users, sender_id must equal auth.uid()
- **UPDATE**: Only receiver can update status (`receiver_id = auth.uid()`)
- **DELETE**: No delete policy (Phase 1 - keep records)

### Security Definer Function
- `is_direct_team_member(sender_id, receiver_id)`: Validates that the receiver is in the sender's direct team (Layer 1 only) by checking `leaders_id_of_my_leader` matches sender's `neverai_id`. Used during insert validation via a trigger.

## New Files

### 1. `src/hooks/useSharedLeads.ts`
Hook that provides:
- `shareLeads(receiverIds: string[], leads: Prospect[])` - Creates shared_leads entries with lead snapshots
- `pendingShares` - Fetches shares where current user is receiver and status = 'pending'
- `pendingCount` - Number of pending shares (for badge)
- `importSharedLeads(shareId: string)` - Imports leads from a share batch into user's prospects table, skipping duplicates by phone number, marks share as 'imported'
- `sentShares` - Fetches shares where current user is sender
- Real-time subscription on `shared_leads` table for the current user

### 2. `src/components/prospects/ShareLeadsDrawer.tsx`
Bottom sheet (mobile) / dialog (desktop) for the sender:
- Triggered from the SheetTabs 3-dot menu ("Share Leads" option)
- Requires selection mode to be active (user selects leads first, then shares)
- Shows direct team members list (from `useDirectTeam` hook) with checkboxes
- Each member shows: name, email/ID, "Direct Team" label
- CTA: "Share Selected Leads" button
- On confirm: calls `shareLeads()`, shows success toast

### 3. `src/components/profile/SharedLeadsDrawer.tsx`
Drawer/page accessible from Profile tab:
- Groups received shares by sender
- Each group shows: sender name, date, lead count
- "View" button: expands to show lead preview (name + phone only)
- "Import" button: imports leads, handles duplicates with warning toast ("X leads imported, Y duplicates skipped"), marks as imported
- Already-imported shares show "Imported" badge instead of buttons

## Modified Files

### 1. `src/components/prospects/SheetTabs.tsx`
- Add "Share Leads" menu item to the 3-dot dropdown (both All tab and individual sheet menus)
- This triggers entering selection mode, then opens the ShareLeadsDrawer

### 2. `src/components/prospects/ProspectTable.tsx`
- Add state for ShareLeadsDrawer open/close
- Pass selected prospect IDs to ShareLeadsDrawer
- Add `onShareLeads` callback to SheetTabs props

### 3. `src/pages/Profile.tsx`
- Add "Shared Leads" menu item (with pending count badge) between existing menu items
- Opens SharedLeadsDrawer

## User Flow

### Sender Flow
1. Go to Calling tab
2. Tap 3-dot menu on sheet tab -> "Share Leads"
3. App enters selection mode (checkboxes appear)
4. User selects leads, taps "Share" action
5. Bottom sheet shows direct team members
6. Select one or more members -> "Share Selected Leads"
7. Success toast: "Leads shared successfully"

### Receiver Flow
1. See badge on Profile tab (pending count)
2. Go to Profile -> "Shared Leads"
3. See shares grouped by sender
4. Tap "View" to preview, or "Import" to add to their Calling tab
5. Duplicates (by phone) are auto-skipped with notification
6. Imported leads get `notes` field appended with "Shared by [Sender Name]"

## Technical Details

- Lead data is snapshotted as jsonb at share time (no live references)
- Duplicate detection uses phone number matching against receiver's existing prospects
- Import creates new prospect rows owned by the receiver (`user_id = receiver's id`)
- Sender's original leads are completely unaffected
- No tracking history is synced
- Uses existing `useDirectTeam` hook for team member resolution
- Mobile-first responsive design using existing Drawer/Sheet components

