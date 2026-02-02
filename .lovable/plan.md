

# Migrate R2 URLs to Public Format

## Problem
Images stored in Cloudflare R2 are using private signed URLs that may expire or require authentication. The `r2-get-upload-url` edge function already has logic to use public URLs, but:

1. The `R2_PUBLIC_URL` secret is **not configured**
2. Existing records have private URLs that need updating

## Current State
- **2 records** need URL migration:
  - 1 in `funnel_price_options` (QR code image)
  - 1 in `funnel_payments` (payment screenshot)
- **23 video assets** exist (these use the `r2-get-playback-url` function separately)

## Implementation

### Step 1: Add R2_PUBLIC_URL Secret
Add the public R2 URL secret so new uploads return accessible URLs.

**Secret Name:** `R2_PUBLIC_URL`
**Value:** `https://pub-d0cae7c30eea4f949d9c33c730813937.r2.dev`

### Step 2: Database Migration
Update existing private URLs to use the public format:

```sql
-- Migrate funnel_price_options QR images
UPDATE funnel_price_options
SET qr_image_url = REPLACE(
  qr_image_url,
  'https://b2cc3a6e16425fd28d16161e9acaa822.r2.cloudflarestorage.com/nevorai/',
  'https://pub-d0cae7c30eea4f949d9c33c730813937.r2.dev/'
)
WHERE qr_image_url LIKE '%r2.cloudflarestorage.com%';

-- Migrate funnel_payments screenshots  
UPDATE funnel_payments
SET upi_screenshot_url = REPLACE(
  upi_screenshot_url,
  'https://b2cc3a6e16425fd28d16161e9acaa822.r2.cloudflarestorage.com/nevorai/',
  'https://pub-d0cae7c30eea4f949d9c33c730813937.r2.dev/'
)
WHERE upi_screenshot_url LIKE '%r2.cloudflarestorage.com%';

-- Migrate funnels thumbnails (if any)
UPDATE funnels
SET thumbnail_url = REPLACE(
  thumbnail_url,
  'https://b2cc3a6e16425fd28d16161e9acaa822.r2.cloudflarestorage.com/nevorai/',
  'https://pub-d0cae7c30eea4f949d9c33c730813937.r2.dev/'
)
WHERE thumbnail_url LIKE '%r2.cloudflarestorage.com%';
```

### Step 3: Verify Edge Function
The `r2-get-upload-url` function already handles public URLs correctly:

```typescript
const R2_PUBLIC_URL = Deno.env.get('R2_PUBLIC_URL');
const publicUrl = R2_PUBLIC_URL 
  ? `${R2_PUBLIC_URL}/${objectKey}`
  : `https://${host}/${R2_BUCKET_NAME}/${objectKey}`;
```

Once `R2_PUBLIC_URL` secret is added, new uploads will automatically use public URLs.

## Files to Modify

| File | Action |
|------|--------|
| Database migration | Create SQL to update existing URLs |
| Project secrets | Add `R2_PUBLIC_URL` secret |

## Expected Result
- Existing 2 image URLs will be publicly accessible
- All new image uploads will return public URLs
- No authentication/signing required for viewing images

