

# Update R2 Edge Functions to Manual AWS Signature V4

## Overview

Replace AWS SDK-based presigned URL generation with native AWS Signature V4 implementation using `crypto.subtle`. This eliminates external SDK dependencies that may cause compatibility issues in Deno/Edge runtime.

---

## Key Changes

| Current Implementation | New Implementation |
|------------------------|-------------------|
| Uses `@aws-sdk/client-s3` | Uses native `crypto.subtle` |
| Uses `@aws-sdk/s3-request-presigner` | Manual AWS4-HMAC-SHA256 signing |
| External esm.sh dependencies | Zero external dependencies (besides Supabase) |
| SDK handles signature complexity | Custom `hmacSha256` helper function |

---

## Benefits of Manual Signing

1. **No external dependencies** - Removes esm.sh SDK imports that may have version/compatibility issues
2. **Smaller bundle size** - Only imports Supabase client
3. **More control** - Direct control over signing parameters
4. **Better reliability** - No SDK version mismatches in edge runtime

---

## Files to Update

### 1. `supabase/functions/r2-get-upload-url/index.ts`

**Changes:**
- Remove `S3Client`, `PutObjectCommand`, `getSignedUrl` imports
- Add manual AWS Signature V4 signing logic
- Use `crypto.subtle` for HMAC-SHA256 operations
- Keep existing authentication and validation logic
- Keep better CORS headers from current version

### 2. `supabase/functions/r2-confirm-upload/index.ts`

**Changes:**
- Remove `S3Client`, `HeadObjectCommand` imports
- Simplify to skip R2 verification (trust client upload confirmation)
- Keep existing authentication and database update logic
- This is acceptable for MVP - can add R2 HEAD verification later if needed

### 3. `supabase/functions/r2-get-playback-url/index.ts`

**Changes:**
- Remove `S3Client`, `GetObjectCommand`, `getSignedUrl` imports
- Add manual AWS Signature V4 signing for GET requests
- Keep existing access control logic (owner, lead token, published funnel checks)
- Use 4-hour expiry for playback URLs

---

## Technical Details

### Manual AWS Signature V4 Implementation

The signing process involves:

```text
1. Create canonical request
2. Create string to sign
3. Calculate signature using HMAC-SHA256 chain:
   - kDate = HMAC("AWS4" + secretKey, dateStamp)
   - kRegion = HMAC(kDate, region)
   - kService = HMAC(kRegion, service)
   - kSigning = HMAC(kService, "aws4_request")
   - signature = HMAC(kSigning, stringToSign)
4. Append signature to query parameters
```

### Helper Function

```typescript
async function hmacSha256(key: ArrayBuffer, data: string): Promise<ArrayBuffer> {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  return await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(data));
}
```

---

## Implementation Details

### r2-get-upload-url
- Method: `PUT`
- Expires: 1 hour (3600 seconds)
- Payload: `UNSIGNED-PAYLOAD`

### r2-get-playback-url
- Method: `GET`
- Expires: 4 hours (14400 seconds)
- Payload: `UNSIGNED-PAYLOAD`

### r2-confirm-upload
- No R2 API calls needed (simplified version trusts client)
- Can optionally add HEAD request verification later

---

## CORS Headers

Will keep the current extended CORS headers for better Supabase client compatibility:

```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};
```

---

## Files Modified

| File | Action |
|------|--------|
| `supabase/functions/r2-get-upload-url/index.ts` | Replace SDK with manual signing |
| `supabase/functions/r2-confirm-upload/index.ts` | Simplify (remove SDK) |
| `supabase/functions/r2-get-playback-url/index.ts` | Replace SDK with manual signing |

---

## Testing Checklist

After implementation:
1. Test video upload flow (get upload URL → upload to R2 → confirm)
2. Test playback URL generation for authenticated user
3. Test playback URL generation for public funnel viewer
4. Verify 4-hour expiry on playback URLs

