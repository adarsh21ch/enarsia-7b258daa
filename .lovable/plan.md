# Product-Scoped Authentication - Implementation Complete

## Status: ✅ Backend Ready

The backend changes for product-scoped authentication have been implemented. The nevorai.com website can now use these edge functions.

---

## Available Edge Functions for nevorai.com

### 1. `send-otp` (Already Updated)
Send OTP for signup - checks product access instead of just user existence.

```typescript
const response = await fetch('https://kisankusogixarejjphi.supabase.co/functions/v1/send-otp', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email })
});
```

### 2. `verify-otp-and-signup` (Already Updated)
Verify OTP and create/link account with product-scoped logic.

```typescript
const response = await fetch('https://kisankusogixarejjphi.supabase.co/functions/v1/verify-otp-and-signup', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, otp_code, password, name })
});
```

### 3. `cross-app-auth` with `check_signup_eligibility` (NEW)
Check if user can sign up for a specific product before showing signup form.

```typescript
const response = await fetch('https://kisankusogixarejjphi.supabase.co/functions/v1/cross-app-auth', {
  method: 'POST',
  headers: { 
    'Content-Type': 'application/json',
    'x-cross-app-secret': 'YOUR_CROSS_APP_SECRET'
  },
  body: JSON.stringify({ 
    action: 'check_signup_eligibility',
    email: 'user@example.com',
    product: 'nevorai' // or 'achievers_club'
  })
});

// Response:
// { success: true, can_signup: true, user_exists: false, has_product: false }
```

---

## Implementation Guide for nevorai.com

### Step 1: Replace `supabase.auth.signUp()` with OTP flow

**Before (broken):**
```typescript
const { error } = await supabase.auth.signUp({ email, password });
// Shows "already registered" for AC users
```

**After (fixed):**
```typescript
// 1. Send OTP
const { data } = await supabase.functions.invoke('send-otp', {
  body: { email }
});

if (data?.success) {
  setStep('otp'); // Show OTP input
}
```

### Step 2: Verify OTP and complete signup

```typescript
const { data } = await supabase.functions.invoke('verify-otp-and-signup', {
  body: { email, otp_code: otpCode, password, name }
});

if (data?.success) {
  // Auto sign-in
  await supabase.auth.signInWithPassword({ email, password });
  
  // Check if user was an AC member
  if (data.is_achievers_club_member) {
    console.log('Linked AC member with leader_id:', data.leader_id);
  }
}
```

### Step 3: (Optional) Pre-check signup eligibility

```typescript
// Before showing signup form, check if user can sign up
const response = await fetch('/functions/v1/cross-app-auth', {
  method: 'POST',
  headers: { 
    'x-cross-app-secret': SECRET,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ 
    action: 'check_signup_eligibility',
    email,
    product: 'nevorai'
  })
});

const { can_signup, user_exists, has_product } = await response.json();

if (!can_signup && has_product) {
  // Redirect to login instead of signup
  showMessage('You already have an account. Please sign in.');
}
```

---

## Testing Checklist

After nevorai.com implements the changes:
- [ ] Achievers Club user can sign up on nevorai.com without "already registered" error
- [ ] New users can sign up normally
- [ ] Existing nevorai.com users get "already have account" message
- [ ] Login works for all users
- [ ] TrackUp Dashboard accessible after signup/login
