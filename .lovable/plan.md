

## Fix: Payment Screenshot Upload 401 Error for Visitors

### Problem

When a funnel visitor tries to upload a payment screenshot, the request hits the `r2-get-upload-url` function which requires either a valid JWT (logged-in user) or a lead token (visitor). The visitor has no JWT, and the lead token (stored as `accessToken`) is not being passed in the `x-lead-token` header -- so the function rejects with 401.

### Solution

Update `UPIPaymentModal.tsx` to call `r2-get-upload-url` (instead of the deprecated `upload-payment-screenshot`) and pass the visitor's access token via the `x-lead-token` header. The edge function already supports this auth path.

### Changes

**File: `src/components/funnels/UPIPaymentModal.tsx`** (lines 74-92)

Replace the `upload-payment-screenshot` call with a `r2-get-upload-url` call that includes the lead token header:

```typescript
// Before:
const urlResponse = await fetch(`${APP_SUPABASE_URL}/functions/v1/upload-payment-screenshot`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    lead_id: leadId,
    access_token: accessToken,
    file_name: file.name,
    content_type: file.type,
  }),
});

// After:
const urlResponse = await fetch(`${APP_SUPABASE_URL}/functions/v1/r2-get-upload-url`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-lead-token': accessToken,
  },
  body: JSON.stringify({
    file_name: file.name,
    file_size: file.size,
    content_type: file.type,
  }),
});
```

Also update the response parsing (line 94) since `r2-get-upload-url` returns `upload_url` and `public_url` (same field names), this stays the same.

### Why This Works

- The `r2-get-upload-url` function already checks for `x-lead-token` header (line 33)
- It validates the token against `funnel_leads.access_token` in the database
- For lead auth, it restricts uploads to images only (JPEG, PNG, WebP, GIF) and max 10MB
- It stores files under `payment-proofs/{leadId}/...` path
- No edge function changes needed -- only the frontend call needs fixing
