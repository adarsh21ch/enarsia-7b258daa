# Cloudflare R2 Video Asset System for NevorAI Funnels

## Status: ✅ IMPLEMENTED

---

## What Was Implemented

### Phase 1: Database Schema ✅
- Created `video_assets` table with RLS policies
- Added `video_asset_id` column to `funnels` table

### Phase 2: R2 Secrets ✅
- `R2_ACCOUNT_ID` - Configured
- `R2_ACCESS_KEY_ID` - Configured
- `R2_SECRET_ACCESS_KEY` - Configured
- `R2_BUCKET_NAME` - Configured

### Phase 3: Edge Functions ✅
- `r2-get-upload-url` - Generates presigned upload URLs
- `r2-confirm-upload` - Confirms upload and marks asset ready
- `r2-get-playback-url` - Generates signed playback URLs (4hr expiry)

### Phase 4: Frontend ✅
- Types: `src/types/video-assets.ts`
- Hooks: `useVideoAssets.ts`, `useVideoUpload.ts`, `usePlaybackUrl.ts`
- Components:
  - `VideoUploadZone.tsx` - Drag-drop upload with progress
  - `VideoAssetLibrary.tsx` - Grid view of user's videos
  - `VideoAssetSelector.tsx` - Modal for selecting/uploading videos
  - `ControlledVideoPlayer.tsx` - Custom player with seek restriction

---

## Integration Notes

To integrate video selection in funnel forms, use:

```tsx
import { VideoAssetSelector } from '@/components/funnels/VideoAssetSelector';

// In your form
<VideoAssetSelector
  value={form.video_asset_id}
  onChange={(assetId) => form.setFieldValue('video_asset_id', assetId)}
/>
```

To display videos with controlled playback:

```tsx
import { ControlledVideoPlayer } from '@/components/funnels/ControlledVideoPlayer';

<ControlledVideoPlayer
  assetId={funnel.video_asset_id}
  leadToken={lead?.access_token}
  allowSeekForward={false}
  allowSpeedControl={true}
  onProgress={(time, duration, percent) => { /* track analytics */ }}
  onComplete={() => { /* unlock CTA */ }}
/>
```

---

## Key Architecture

| Feature | Implementation |
|---------|---------------|
| Storage | Cloudflare R2 (no Supabase Storage) |
| URLs | Signed on-demand (4hr expiry) |
| Upload | Direct browser-to-R2 (presigned PUT) |
| Security | RLS on video_assets table |
| Reuse | One video, many funnels via video_asset_id |
| Analytics | Per-funnel isolation (unchanged) |
