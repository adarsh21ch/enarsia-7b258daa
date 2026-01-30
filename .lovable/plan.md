

# Fix r2-get-upload-url Edge Function - Include content-type in Signature

## Problem

The current AWS Signature V4 implementation only signs the `host` header. For R2/S3 PUT operations, the `content-type` header should also be included in the signature to prevent signature mismatch errors.

---

## Changes Required

### File: `supabase/functions/r2-get-upload-url/index.ts`

| Line | Current | Fixed |
|------|---------|-------|
| 10 | `hmacSha256(key: ArrayBuffer, ...)` | `hmacSha256(key: ArrayBuffer \| Uint8Array, ...)` |
| 125 | `signedHeaders = 'host'` | `signedHeaders = 'content-type;host'` |
| 137 | `canonicalHeaders = \`host:${host}\n\`` | `canonicalHeaders = \`content-type:${content_type}\nhost:${host}\n\`` |
| 182 | Missing `content_type` in response | Add `content_type: content_type` |

---

## Technical Details

### Why include content-type?

When uploading to R2/S3 with a presigned URL, the client must send the exact same headers that were signed. If `content-type` is not in the signed headers but the client sends it, R2 may reject the request with a signature mismatch error.

### Header Order

AWS Signature V4 requires headers in alphabetical order:
- `content-type` comes before `host`
- Signed headers: `content-type;host`

### Updated Canonical Headers Format

```text
content-type:video/mp4
host:accountid.r2.cloudflarestorage.com
```

---

## Implementation

1. Update `hmacSha256` function signature to accept both `ArrayBuffer` and `Uint8Array`
2. Change `signedHeaders` to include `content-type;host` (alphabetical)
3. Update `canonicalHeaders` to include content-type header value
4. Add `content_type` to response so frontend knows what Content-Type header to use

---

## Response Format (Updated)

```json
{
  "upload_url": "https://...",
  "object_key": "videos/user-id/timestamp-filename.mp4",
  "asset_id": "uuid",
  "content_type": "video/mp4"
}
```

The frontend should use this `content_type` value when making the PUT request to R2.

