
# Implementation Plan: Complete Funnels Payment System

## Overview
This plan addresses the missing components identified in the audit to enable full UPI manual payment flow with QR codes and screenshot uploads.

---

## Phase 1: Backend Edge Functions

### 1.1 Create `submit-payment-proof` Edge Function
**File:** `supabase/functions/submit-payment-proof/index.ts`

Creates a new edge function that:
- Accepts lead_id, funnel_id, price_option_id, amount, and screenshot_url
- Validates the lead exists
- Inserts a payment record with status `pending` into `funnel_payments` table
- Uses service role key for database operations

### 1.2 Update `supabase/config.toml`
Add configuration for new edge functions:
- `submit-payment-proof` with `verify_jwt = false` (public endpoint for leads)
- `create-funnel-lead` with `verify_jwt = false` (currently missing from config)

---

## Phase 2: Frontend Components

### 2.1 Create QR Code Uploader Component
**File:** `src/components/funnels/QRCodeUploader.tsx`

A component for funnel editors to upload QR code images:
- Uses R2 presigned URL flow for image upload
- Displays preview of uploaded QR code
- Returns the public URL for storage

### 2.2 Create UPI Payment Modal
**File:** `src/components/funnels/UPIPaymentModal.tsx`

Dialog shown to leads when making UPI payment:
- Displays QR code image and UPI ID
- Shows payment amount
- Provides file upload for payment screenshot
- Submits screenshot via `submit-payment-proof` edge function
- Shows pending confirmation message

### 2.3 Create Price Options Manager
**File:** `src/components/funnels/PriceOptionsManager.tsx`

Component for managing multiple price tiers in FunnelEditor:
- Add/edit/delete price options
- Each option has: label, amount, UPI ID, QR image
- Set default option
- Reorderable list

---

## Phase 3: Page Updates

### 3.1 Update FunnelEditor.tsx
Enhance the payment settings section:
- When payment_type is `upi_manual`, show PriceOptionsManager
- Load and save price options from `funnel_price_options` table
- Add hooks for managing price options CRUD

### 3.2 Update FunnelView.tsx (Public Funnel Page)
Enhance the CTA click handler:
- For `upi_manual` funnels: Open UPIPaymentModal with price options
- Handle price option selection
- Track payment submission status
- Show "Payment Pending Verification" state after screenshot upload

---

## Phase 4: Hooks & Types

### 4.1 Create useFunnelPriceOptions Hook
**File:** `src/hooks/useFunnelPriceOptions.ts`

React Query hook for:
- Fetching price options for a funnel
- Creating new price options
- Updating existing options
- Deleting options
- Reordering options

### 4.2 Update Types
**File:** `src/types/funnels.ts`

Add interfaces:
- `FunnelPriceOption` - represents a price tier
- `PaymentProofSubmission` - payload for submit-payment-proof

---

## File Changes Summary

| File | Action |
|------|--------|
| `supabase/functions/submit-payment-proof/index.ts` | Create |
| `supabase/config.toml` | Edit (add 2 function configs) |
| `src/components/funnels/QRCodeUploader.tsx` | Create |
| `src/components/funnels/UPIPaymentModal.tsx` | Create |
| `src/components/funnels/PriceOptionsManager.tsx` | Create |
| `src/hooks/useFunnelPriceOptions.ts` | Create |
| `src/types/funnels.ts` | Edit (add types) |
| `src/pages/FunnelEditor.tsx` | Edit (add PriceOptionsManager) |
| `src/pages/FunnelView.tsx` | Edit (add UPI payment flow) |

---

## Technical Details

### Edge Function: submit-payment-proof

```text
Endpoint: POST /functions/v1/submit-payment-proof
Body: {
  lead_id: string,
  funnel_id: string,
  price_option_id?: string,
  amount: number,
  screenshot_url: string
}
Response: {
  success: boolean,
  payment_id: string,
  status: 'pending'
}
```

Uses `SUPABASE_SERVICE_ROLE_KEY` to insert into `funnel_payments` table since leads are not authenticated users.

### R2 Image Upload Flow (QR Codes & Screenshots)

The existing R2 functions work for authenticated users (funnel owners uploading QR codes). For lead screenshot uploads, we'll need to either:
1. Create a public R2 upload endpoint specifically for payment screenshots
2. Or use the existing flow with a lead token for authorization

Recommended approach: Create a dedicated `upload-payment-screenshot` endpoint that validates the lead token instead of requiring auth.

### Database Interactions

Price options are stored in `funnel_price_options`:
- `funnel_id`, `label`, `amount`, `upi_id`, `qr_image_url`, `sort_order`, `is_default`

Payments are stored in `funnel_payments`:
- `lead_id`, `funnel_id`, `provider: 'manual'`, `amount`, `status: 'pending'`, `upi_screenshot_url`

---

## Implementation Order

1. Create `submit-payment-proof` edge function
2. Update `config.toml`
3. Create `useFunnelPriceOptions` hook
4. Update `src/types/funnels.ts`
5. Create `QRCodeUploader` component
6. Create `PriceOptionsManager` component
7. Update `FunnelEditor.tsx`
8. Create `UPIPaymentModal` component
9. Update `FunnelView.tsx`
10. Test end-to-end flow
