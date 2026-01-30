
# Cloudflare R2 Video Asset System for NevorAI Funnels

## Overview

This plan implements a complete video asset management system using Cloudflare R2 storage, enabling:
- One-time video uploads stored in R2
- Video reuse across multiple funnels (no duplicates)
- Controlled playback with seek restriction, speed control, and CTA locking
- Isolated analytics per funnel/lead (not per video asset)

---

## Phase 1: Database Schema

### 1.1 Create `video_assets` Table

Run this migration to create the video assets table:

```sql
CREATE TABLE IF NOT EXISTS public.video_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  r2_object_key TEXT NOT NULL UNIQUE,
  thumbnail_key TEXT,
  duration_seconds INTEGER,
  file_size_bytes BIGINT NOT NULL,
  mime_type TEXT DEFAULT 'video/mp4',
  status TEXT DEFAULT 'processing' 
    CHECK (status IN ('processing', 'ready', 'failed')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_video_assets_owner ON video_assets(owner_user_id);
CREATE INDEX idx_video_assets_status ON video_assets(status) WHERE status = 'ready';

-- RLS
ALTER TABLE video_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own video assets" ON video_assets
  FOR ALL USING (auth.uid() = owner_user_id);

-- Auto-update trigger
CREATE OR REPLACE FUNCTION update_video_assets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER video_assets_updated_at
  BEFORE UPDATE ON video_assets
  FOR EACH ROW EXECUTE FUNCTION update_video_assets_updated_at();
```

### 1.2 Update `funnels` Table

Add `video_asset_id` column to link funnels to video assets:

```sql
ALTER TABLE public.funnels 
  ADD COLUMN IF NOT EXISTS video_asset_id UUID REFERENCES public.video_assets(id);

CREATE INDEX idx_funnels_video_asset ON funnels(video_asset_id);
```

---

## Phase 2: R2 Secrets Configuration

Before implementing edge functions, these secrets must be added to Lovable Cloud:

| Secret Name | Description |
|-------------|-------------|
| `R2_ACCOUNT_ID` | Cloudflare account ID |
| `R2_ACCESS_KEY_ID` | R2 API access key |
| `R2_SECRET_ACCESS_KEY` | R2 API secret key |
| `R2_BUCKET_NAME` | R2 bucket name (e.g., `nevorai-videos`) |

---

## Phase 3: Edge Functions

### 3.1 `r2-get-upload-url`

**Purpose:** Generate presigned URL for direct browser-to-R2 upload

**Location:** `supabase/functions/r2-get-upload-url/index.ts`

**Flow:**
1. Authenticate user via JWT
2. Validate file type (MP4, WebM, MOV only) and size (max 500MB)
3. Create `video_assets` record with status `processing`
4. Generate presigned PUT URL using AWS S3 SDK
5. Return upload URL, asset ID, and object key

**Config:** `verify_jwt = false` (manual JWT validation in code)

### 3.2 `r2-confirm-upload`

**Purpose:** Confirm upload completion and mark asset as ready

**Location:** `supabase/functions/r2-confirm-upload/index.ts`

**Flow:**
1. Authenticate user
2. Verify file exists in R2 using HeadObject
3. Update asset status to `ready`
4. Optionally update title

**Config:** `verify_jwt = false`

### 3.3 `r2-get-playback-url`

**Purpose:** Generate signed playback URL for video viewing

**Location:** `supabase/functions/r2-get-playback-url/index.ts`

**Flow:**
1. Check access via:
   - Authenticated user owns asset OR
   - Lead token references funnel with this asset OR
   - Asset belongs to a published funnel
2. Generate presigned GET URL (4-hour expiry)
3. Return URL with asset metadata

**Config:** `verify_jwt = false` (supports both authenticated and anonymous access)

---

## Phase 4: Frontend Implementation

### 4.1 Types

**File:** `src/types/video-assets.ts`

```typescript
export interface VideoAsset {
  id: string;
  owner_user_id: string;
  title: string;
  description?: string;
  r2_object_key: string;
  thumbnail_key?: string;
  duration_seconds?: number;
  file_size_bytes: number;
  mime_type: string;
  status: 'processing' | 'ready' | 'failed';
  created_at: string;
  updated_at: string;
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}
```

### 4.2 Hooks

**File:** `src/hooks/useVideoAssets.ts`
- Fetch user's video assets
- Filter by status
- CRUD operations

**File:** `src/hooks/useVideoUpload.ts`
- Get presigned upload URL
- Upload file to R2 with progress tracking
- Confirm upload completion

**File:** `src/hooks/usePlaybackUrl.ts`
- Fetch signed playback URL
- Cache URL until expiry
- Refresh on demand

### 4.3 Components

**File:** `src/components/funnels/VideoAssetLibrary.tsx`
- Grid view of user's video assets
- Search and filter
- Delete option (if not in use)
- Shows: thumbnail, title, duration, file size

**File:** `src/components/funnels/VideoAssetSelector.tsx`
- Modal/drawer for selecting video
- Two tabs: "My Videos" and "Upload New"
- Shows selected video preview

**File:** `src/components/funnels/VideoUploadZone.tsx`
- Drag-and-drop upload area
- File type validation
- Upload progress bar
- Title input after upload

**File:** `src/components/funnels/ControlledVideoPlayer.tsx`
- Custom HTML5 video player
- Seek restriction (forward blocked if configured)
- Speed control toggle
- Progress tracking via existing analytics edge functions
- CTA lock until video completion

---

## Phase 5: Funnel Form Integration

### 5.1 Update Funnel Create/Edit Form

Replace the `video_url` text field with:

```text
┌────────────────────────────────────────────┐
│  📹 Video                                  │
├────────────────────────────────────────────┤
│  ┌──────────────────────────────────────┐  │
│  │  [Selected Video Preview]            │  │
│  │  "Product Demo.mp4"                  │  │
│  │  Duration: 5:32 • Size: 45.2 MB      │  │
│  └──────────────────────────────────────┘  │
│                                            │
│  [ Choose Video ]  [ Upload New ]          │
└────────────────────────────────────────────┘
```

### 5.2 Form Logic

- When creating funnel: require video selection
- Store `video_asset_id` instead of `video_url`
- `video_url` becomes deprecated (nullable for legacy)

---

## Phase 6: Config Updates

### 6.1 Update `supabase/config.toml`

Add new edge function configurations:

```toml
[functions.r2-get-upload-url]
verify_jwt = false

[functions.r2-confirm-upload]
verify_jwt = false

[functions.r2-get-playback-url]
verify_jwt = false
```

---

## File Structure Summary

```text
New Files:
├── supabase/functions/
│   ├── r2-get-upload-url/index.ts
│   ├── r2-confirm-upload/index.ts
│   └── r2-get-playback-url/index.ts
├── src/types/
│   └── video-assets.ts
├── src/hooks/
│   ├── useVideoAssets.ts
│   ├── useVideoUpload.ts
│   └── usePlaybackUrl.ts
└── src/components/funnels/
    ├── VideoAssetLibrary.tsx
    ├── VideoAssetSelector.tsx
    ├── VideoUploadZone.tsx
    └── ControlledVideoPlayer.tsx

Modified Files:
├── supabase/config.toml (add 3 edge function configs)
└── src/integrations/supabase/types.ts (auto-updated after migration)
```

---

## Implementation Order

1. **First:** Add R2 secrets (user action required)
2. **Second:** Run database migration (video_assets table + funnels update)
3. **Third:** Create edge functions
4. **Fourth:** Create types and hooks
5. **Fifth:** Build UI components
6. **Sixth:** Integrate into funnel form

---

## Key Architecture Decisions

| Decision | Rationale |
|----------|-----------|
| R2 object keys, not URLs | Signed URLs generated on-demand for security |
| One video, many funnels | Cost-efficient, prevents duplicate storage |
| Per-funnel analytics | Reusing video doesn't merge analytics |
| 500MB max file size | Balance between quality and upload reliability |
| 4-hour playback URLs | Long enough for viewing, short enough for security |
| Browser-to-R2 direct upload | Avoids edge function timeout/size limits |

---

## Security Considerations

- All uploads require authentication
- Playback URLs are time-limited (4 hours)
- RLS ensures users can only see their own assets
- Public funnels allow anonymous playback (by design)
- No external/YouTube URLs allowed (R2 only)
