
# Update TrackUp/nevorai.com for Product-Scoped Authentication

## Problem
The nevorai.com website (TrackUp Dashboard, Nevorai Forms, etc.) uses the same Supabase authentication as the Nevorai mobile app. When Achievers Club users try to sign up on nevorai.com, they see "already registered" errors because the website is checking `auth.users` directly.

## Solution Overview
Since the nevorai.com website is a **separate application** outside this Lovable project, we need to:

1. **Create backend edge functions** in this project that nevorai.com can call for signup
2. **Provide documentation** for the nevorai.com website to implement the new flow

---

## Part 1: Backend Changes (This Project)

### New Edge Function: `website-send-otp`
Create a version of send-otp specifically for the nevorai.com website with CORS configured for that domain:

```typescript
// supabase/functions/website-send-otp/index.ts
// Same logic as send-otp but:
// - Accepts 'product' parameter (default: 'nevorai')
// - Configured for nevorai.com origin
```

### New Edge Function: `website-signup`
Create a signup endpoint for nevorai.com:

```typescript
// supabase/functions/website-signup/index.ts
// - Accepts: email, otp_code, password, name, product
// - Uses product-scoped logic (checks user_products table)
// - Returns session token for auto-login
```

### Update `cross-app-auth` Edge Function
Add new actions for TrackUp signup that use product-scoped logic:

```typescript
// New action: 'check_signup_eligibility'
case 'check_signup_eligibility': {
  const { email, product } = requestBody;
  
  // Check if user has access to this specific product
  const { data: hasProduct } = await supabase
    .from('user_products')
    .select('id')
    .eq('user_id', profile.user_id)
    .eq('product', product)
    .maybeSingle();
  
  return jsonResponse({
    can_signup: !hasProduct,
    user_exists: !!profile
  });
}

// New action: 'website_create_user'
case 'website_create_user': {
  // Similar logic to verify-otp-and-signup
  // but callable via cross-app secret
}
```

---

## Part 2: nevorai.com Website Changes (External)

The nevorai.com website needs to update its authentication flow:

### Current Flow (Broken)
```
User enters email → supabase.auth.signUp() → "already registered" error
```

### New Flow (Fixed)
```
User enters email → call /website-send-otp → show OTP input
User enters OTP → call /website-signup → auto-login
```

### Code Changes for nevorai.com

**1. Replace Supabase auth.signUp with edge function calls:**

```typescript
// Before (in nevorai.com/auth page)
const { error } = await supabase.auth.signUp({ email, password });

// After
const { data, error } = await supabase.functions.invoke('website-send-otp', {
  body: { email, product: 'nevorai' }
});

if (data?.success) {
  // Show OTP input
  setStep('otp');
}
```

**2. Verify OTP and create account:**

```typescript
const { data, error } = await supabase.functions.invoke('website-signup', {
  body: {
    email,
    otp_code: otpCode,
    password,
    name,
    product: 'nevorai'
  }
});

if (data?.success) {
  // Auto sign-in
  await supabase.auth.signInWithPassword({ email, password });
}
```

---

## Part 3: Files to Create/Modify in This Project

| File | Action | Purpose |
|------|--------|---------|
| `supabase/functions/website-send-otp/index.ts` | Create | OTP endpoint for nevorai.com |
| `supabase/functions/website-signup/index.ts` | Create | Signup endpoint with product scope |
| `supabase/functions/cross-app-auth/index.ts` | Update | Add signup eligibility check |

---

## Alternative: Reuse Existing Edge Functions

Instead of creating new edge functions, the nevorai.com website can call the existing `send-otp` and `verify-otp-and-signup` edge functions directly, as they already implement product-scoped logic.

**nevorai.com just needs to:**
1. Call `send-otp` with the email
2. Show OTP input UI
3. Call `verify-otp-and-signup` with email, otp_code, password, name
4. Auto sign-in after success

This is the simplest approach since the edge functions are already updated!

---

## Recommended Approach

Since `send-otp` and `verify-otp-and-signup` already have product-scoped logic, the nevorai.com website only needs **frontend changes** to:

1. Replace `supabase.auth.signUp()` calls with edge function calls
2. Add OTP verification UI (similar to `src/pages/Auth.tsx` in this project)

**No additional backend changes needed!**

---

## Testing Checklist

After nevorai.com website is updated:
- [ ] Achievers Club user can sign up on nevorai.com without "already registered" error
- [ ] New users can sign up normally
- [ ] Existing nevorai.com users cannot sign up again (redirected to login)
- [ ] Login works for all users
- [ ] TrackUp Dashboard accessible after signup/login
