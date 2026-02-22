

# Share Leads Feature Enhancement Plan

## Overview
This plan upgrades the Share Leads system to be more professional, flexible, and integrated with Nevorai Forms. Three major improvements are covered.

---

## 1. Add "Share to Team" in Nevorai Forms

**What changes:** The existing `ShareFormDialog` (which currently only has "Copy Link" and "WhatsApp") will get a new "Share to Team" button that opens the same team member selector used for prospect sharing.

**How it works:**
- In `FormsListTab.tsx`, the "Share Options" menu item will trigger the updated dialog
- The `ShareFormDialog` will gain a third action: "Share to Team" which opens a team member picker (reusing the `ShareLeadsDrawer` pattern)
- When a user shares a form to team members, the form's public link is sent as a shared lead record (or alternatively, the form submissions are packaged as lead data)
- This uses the existing `useDirectTeam` hook and `useSharedLeads.shareLeads()` mechanism

**Files modified:**
- `src/features/forms/components/ShareFormDialog.tsx` -- Add "Share to Team" button and team member selection UI
- `src/features/forms/components/FormsListTab.tsx` -- Pass form submissions data to share dialog

---

## 2. Instant Refresh After Import

**What changes:** After importing shared leads, the Calling tab's prospect list updates immediately without requiring a manual refresh.

**How it works:**
- After `importSharedLeads()` succeeds in `useSharedLeads.ts`, call the ProspectsContext's `refetch()` to reload prospects from the database
- Also invalidate the sheets query cache so new sheets (e.g., "SheetName *") appear instantly in the tabs
- In `SharedLeads.tsx`, after a successful import, use React Query's `queryClient.invalidateQueries` to refresh both prospects and sheets caches

**Files modified:**
- `src/pages/SharedLeads.tsx` -- Add query cache invalidation after import
- `src/hooks/useSharedLeads.ts` -- Return enough info for the caller to trigger refetch

---

## 3. Professional Shared Leads Viewer (Forms-like Interface)

**What changes:** The Shared Leads page (`/shared-leads`) gets a complete redesign to look and behave like the Nevorai Forms responses page, with:

- **Stats bar** showing Total leads, Pending, Imported counts
- **Card/Table view toggle** (like Forms responses)
- **Search** across leads by name/phone
- **Download as Excel/CSV** for any shared batch
- **Re-importable batches** -- Remove the one-time import restriction; users can import the same batch multiple times
- **Detailed lead view** in a table format showing all fields (name, phone, sheet, notes, etc.)

**How it works:**

**a) Remove one-time import lock:**
- In `useSharedLeads.ts`, the `importSharedLeads` function currently marks the share as `status: 'imported'` and the UI hides the Import button for imported shares
- Change: Keep the status tracking for badge display, but always show the Import button regardless of status
- The duplicate phone check already prevents actual duplicates, so re-importing is safe

**b) Professional UI redesign of SharedLeads.tsx:**
- Add a header with stats (total batches, total leads, pending/imported counts)
- Add Card/Table view toggle similar to FormResponsesPage
- Table view: spreadsheet-like layout with columns for Name, Phone, Sheet, Sender, Date, Status
- Card view: enhanced cards with full lead details
- Search bar filtering across all shared lead data
- Per-batch and global Excel/CSV export using the `xlsx` library

**c) Export functionality:**
- Add "Export" option (CSV/Excel) per batch and for all shared leads
- Reuse the same `xlsx` library already in the project

**Files modified:**
- `src/pages/SharedLeads.tsx` -- Complete redesign with stats, search, view toggle, export, re-import
- `src/hooks/useSharedLeads.ts` -- Allow re-import (remove status gate on Import button), add import count tracking

---

## Technical Details

### ShareFormDialog Enhancement
```text
+----------------------------------+
|         Share Form               |
|  [Form Link input] [Copy]       |
|  [Copy Link]  [WhatsApp]        |
|  -------- or --------           |
|  [Share to Team Members]        |
|    [ ] Member 1                 |
|    [ ] Member 2                 |
|  [Send to Selected]             |
+----------------------------------+
```

### SharedLeads Page Redesign
```text
+----------------------------------+
| < Shared Leads                   |
| Total: 5 batches | 47 leads     |
| [Pending: 2] [Imported: 3]      |
|                                  |
| [Search...]     [Card|Table] [...|
|                                  |
| -- Batch cards/table rows --     |
| From: John | 10 leads | Sheet X |
| [Import] [Download] [View]      |
+----------------------------------+
```

### Import Instant Refresh Flow
```text
User clicks Import
  -> importSharedLeads() inserts into prospects table
  -> Invalidate 'prospects' query cache
  -> Invalidate 'sheets' query cache  
  -> ProspectsContext refetch triggers
  -> Calling tab shows new leads instantly
```

### Files Summary
| File | Change |
|------|--------|
| `src/features/forms/components/ShareFormDialog.tsx` | Add "Share to Team" with member picker |
| `src/features/forms/components/FormsListTab.tsx` | Pass form data for team sharing |
| `src/pages/SharedLeads.tsx` | Full redesign: stats, search, views, export, re-import |
| `src/hooks/useSharedLeads.ts` | Allow re-import, add export helpers |

