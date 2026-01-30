
# Complete NevorAI Funnels System - Remaining Implementation

## Overview

The R2 video infrastructure is complete. This plan implements the **Funnels UI** - the pages and components needed to create, manage, and view video sales funnels.

---

## Current State (Already Implemented)

| Component | Status |
|-----------|--------|
| Database tables (funnels, funnel_leads, funnel_payments, funnel_video_analytics, video_assets) | ✅ Done |
| Edge functions (r2-get-upload-url, r2-confirm-upload, r2-get-playback-url) | ✅ Done |
| Video types and hooks (useVideoAssets, useVideoUpload, usePlaybackUrl) | ✅ Done |
| Video components (VideoAssetSelector, VideoUploadZone, VideoAssetLibrary, ControlledVideoPlayer) | ✅ Done |

---

## Phase 1: Funnels Data Layer

### 1.1 Create `useFunnels` Hook

**File:** `src/hooks/useFunnels.ts`

Provides CRUD operations for funnels:
- `useFunnels()` - List user's funnels with counts
- `useFunnel(id)` - Get single funnel details
- `useCreateFunnel()` - Create new funnel
- `useUpdateFunnel()` - Update funnel settings
- `useDeleteFunnel()` - Delete funnel
- `usePublishFunnel()` - Toggle publish state

### 1.2 Create `useFunnelLeads` Hook

**File:** `src/hooks/useFunnelLeads.ts`

Manages leads for a specific funnel:
- `useFunnelLeads(funnelId)` - List leads with pagination
- `useFunnelLeadStats(funnelId)` - Aggregate stats (total leads, completion rate, payments)

### 1.3 Create Funnel Types

**File:** `src/types/funnels.ts`

```typescript
export interface Funnel {
  id: string;
  owner_user_id: string;
  title: string;
  slug: string;
  description?: string;
  video_asset_id?: string;
  video_url?: string; // Legacy, deprecated
  thumbnail_url?: string;
  allow_speed_control: boolean;
  allow_forward_seek: boolean;
  lock_cta_until_complete: boolean;
  price: number;
  payment_type: 'razorpay' | 'upi_manual' | 'free';
  upi_id?: string;
  cta_button_text: string;
  cta_redirect_url?: string;
  success_message?: string;
  is_published: boolean;
  created_at: string;
  updated_at: string;
  // Computed fields
  leads_count?: number;
  video_asset?: VideoAsset;
}

export interface FunnelLead {
  id: string;
  funnel_id: string;
  name: string;
  phone?: string;
  email?: string;
  video_watch_percent: number;
  video_completed: boolean;
  payment_status_cache: 'pending' | 'paid' | 'failed';
  created_at: string;
}
```

---

## Phase 2: Funnels Management Pages

### 2.1 Funnels List Page

**File:** `src/pages/Funnels.tsx`

**Features:**
- Grid/list of user's funnels
- Shows: title, thumbnail, leads count, published status
- Quick actions: edit, preview, copy link, delete
- "Create Funnel" button

**UI Layout:**
```text
┌─────────────────────────────────────────────────┐
│  My Funnels                     [+ Create New]  │
├─────────────────────────────────────────────────┤
│  ┌──────────────────┐  ┌──────────────────┐     │
│  │ [Video Thumb]    │  │ [Video Thumb]    │     │
│  │ Product Demo     │  │ Webinar Funnel   │     │
│  │ 24 leads • Live  │  │ 156 leads • Draft│     │
│  │ [Edit] [Preview] │  │ [Edit] [Publish] │     │
│  └──────────────────┘  └──────────────────┘     │
└─────────────────────────────────────────────────┘
```

### 2.2 Create/Edit Funnel Page

**File:** `src/pages/FunnelEditor.tsx`

**Sections:**
1. **Basic Info** - Title, description, slug
2. **Video** - VideoAssetSelector component (R2 upload/select)
3. **Player Settings** - Speed control, seek restriction, CTA lock
4. **CTA & Payment** - Button text, price, payment type, UPI ID
5. **Success** - Redirect URL, success message

**Form Fields:**
```text
┌─────────────────────────────────────────────────┐
│  Create Funnel                                  │
├─────────────────────────────────────────────────┤
│  Title: [________________]                      │
│  URL Slug: nevorai.app/f/[__________]           │
│  Description: [__________________________]      │
│                                                 │
│  📹 Video                                       │
│  ┌────────────────────────────────────────┐     │
│  │ [VideoAssetSelector Component]         │     │
│  └────────────────────────────────────────┘     │
│                                                 │
│  ⚙️ Player Controls                             │
│  ☑ Lock CTA until video completes               │
│  ☐ Allow speed control                          │
│  ☐ Allow forward seeking                        │
│                                                 │
│  💳 Payment                                     │
│  Type: [Free ▾]  Price: [₹0]                    │
│  CTA Button: [Get Access Now]                   │
│  Redirect URL: [https://...]                    │
│                                                 │
│  [Save Draft]  [Save & Publish]                 │
└─────────────────────────────────────────────────┘
```

### 2.3 Funnel Analytics Page

**File:** `src/pages/FunnelAnalytics.tsx`

**Features:**
- View leads for a specific funnel
- Stats: total leads, completion rate, payment conversion
- Leads table with: name, watch %, payment status, date
- Export to Excel option

---

## Phase 3: Public Funnel Viewer

### 3.1 Public Viewer Page

**File:** `src/pages/FunnelView.tsx`
**Route:** `/f/:slug`

**Flow:**
1. Load funnel by slug (public, no auth required)
2. Show lead capture form (name, phone/email)
3. After capture → Show video with ControlledVideoPlayer
4. Track progress → Save to funnel_leads
5. On completion → Show CTA button
6. Handle payment flow if price > 0

**UI Phases:**

```text
Phase 1: Lead Capture
┌─────────────────────────────────────────────────┐
│  [Video Thumbnail / Blurred Preview]            │
│                                                 │
│  Enter your details to watch:                   │
│  Name: [________________]                       │
│  Phone: [________________]                      │
│  [Watch Video →]                                │
└─────────────────────────────────────────────────┘

Phase 2: Video Playback
┌─────────────────────────────────────────────────┐
│  ┌───────────────────────────────────────────┐  │
│  │                                           │  │
│  │       [ControlledVideoPlayer]             │  │
│  │                                           │  │
│  └───────────────────────────────────────────┘  │
│                                                 │
│  [CTA Button - Locked until complete]           │
└─────────────────────────────────────────────────┘

Phase 3: CTA Active
┌─────────────────────────────────────────────────┐
│  ✅ Video Complete!                             │
│                                                 │
│  [Get Access Now - ₹499]  ←── Enabled           │
└─────────────────────────────────────────────────┘
```

### 3.2 Payment Handling

For `payment_type = 'razorpay'`:
- Use existing Razorpay integration
- Create order via edge function
- Handle payment completion

For `payment_type = 'upi_manual'`:
- Show UPI QR code / ID
- Allow screenshot upload
- Owner manually verifies

### 3.3 Lead Progress Tracking

**Edge Function:** `supabase/functions/funnel-track-progress/index.ts`

Saves watch progress events:
- Called periodically from ControlledVideoPlayer
- Updates `funnel_leads` record
- Inserts into `funnel_video_analytics`

---

## Phase 4: Routing Updates

### 4.1 Add Routes to App.tsx

```typescript
// New Funnels routes
<Route path="/funnels" element={<Funnels />} />
<Route path="/funnels/new" element={<FunnelEditor />} />
<Route path="/funnels/:id/edit" element={<FunnelEditor />} />
<Route path="/funnels/:id/analytics" element={<FunnelAnalytics />} />

// Public funnel viewer (no auth)
<Route path="/f/:slug" element={<FunnelView />} />
```

### 4.2 Add Funnels to Navigation

Add "Funnels" link to the Profile page or create a dedicated nav item for authenticated users.

---

## Phase 5: Edge Function for Progress Tracking

### 5.1 `funnel-track-progress`

**File:** `supabase/functions/funnel-track-progress/index.ts`

**Purpose:** Track video watch progress from public viewer

**Input:**
```json
{
  "lead_token": "abc123",
  "current_time": 120,
  "duration": 300,
  "event_type": "progress"
}
```

**Logic:**
1. Validate lead token
2. Update `funnel_leads` with watch progress
3. Insert event into `funnel_video_analytics`
4. Return updated lead state

---

## File Structure Summary

```text
New Files:
├── src/types/
│   └── funnels.ts
├── src/hooks/
│   ├── useFunnels.ts
│   └── useFunnelLeads.ts
├── src/pages/
│   ├── Funnels.tsx          (List all funnels)
│   ├── FunnelEditor.tsx     (Create/Edit funnel)
│   ├── FunnelAnalytics.tsx  (View leads/stats)
│   └── FunnelView.tsx       (Public viewer)
├── src/components/funnels/
│   ├── FunnelCard.tsx       (Grid card component)
│   ├── FunnelForm.tsx       (Form fields component)
│   ├── LeadCaptureForm.tsx  (Public lead form)
│   └── FunnelLeadsTable.tsx (Analytics table)
└── supabase/functions/
    └── funnel-track-progress/index.ts

Modified Files:
├── src/App.tsx              (Add routes)
├── src/pages/Profile.tsx    (Add Funnels link)
└── supabase/config.toml     (Add edge function config)
```

---

## Implementation Order

1. **First:** Types and hooks (funnels.ts, useFunnels.ts, useFunnelLeads.ts)
2. **Second:** Funnels list page and FunnelCard component
3. **Third:** FunnelEditor page with VideoAssetSelector integration
4. **Fourth:** Public FunnelView page with lead capture
5. **Fifth:** Progress tracking edge function
6. **Sixth:** FunnelAnalytics page
7. **Seventh:** Route updates and navigation

---

## Key Integration Points

| Component | Uses |
|-----------|------|
| FunnelEditor | VideoAssetSelector → stores video_asset_id |
| FunnelView | ControlledVideoPlayer → fetches via r2-get-playback-url |
| ControlledVideoPlayer | Calls funnel-track-progress on timeupdate |
| FunnelCard | Shows video_asset metadata (duration, thumbnail) |

---

## Security Considerations

- Public routes (`/f/:slug`) require no authentication
- Lead capture creates anonymous lead with access_token
- Video playback URL validated via lead_token OR published funnel check
- Analytics/management pages require authentication + ownership check
