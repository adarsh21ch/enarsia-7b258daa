

## Plan: Update RESEND_API_KEY and Test OTP Flow

### Overview
Update the `RESEND_API_KEY` secret with the new US region API key and verify the send-otp edge function works correctly.

### Steps

#### 1. Update the RESEND_API_KEY Secret
Replace the existing `RESEND_API_KEY` with the new key from the US region (North Virginia) where `nevorai.com` is verified.

#### 2. Deploy and Test the send-otp Function
After updating the secret:
- Redeploy the `send-otp` edge function
- Test with a sample email address
- Verify the OTP email is sent successfully

#### 3. Verify End-to-End Flow
- Test the complete signup flow in the Auth page
- Confirm OTP email arrives
- Verify the verification step works

### Expected Outcome
The `send-otp` function should successfully send verification emails from `noreply@nevorai.com` now that the API key region matches the verified domain region.

### Technical Details
- **Secret to update**: `RESEND_API_KEY`
- **New value**: The API key you provided (from US region)
- **Domain**: nevorai.com (verified in North Virginia / us-east-1)
- **Sender**: noreply@nevorai.com

