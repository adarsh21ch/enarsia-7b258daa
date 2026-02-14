

## Fix: Remove Unnecessary Service Role Bypass, Fix JWT Auth Flow

### Root Cause

Since there's no separate "App Supabase" — this Lovable Cloud project IS the backend — the service role bypass is unnecessary for normal user flows. The frontend calls `supabase.functions.invoke('r2-get-upload-url')`, which sends the **user's JWT** in the Authorization header. The function should validate that JWT normally via `supabase.auth.getUser()`.

The Lovable Cloud proxy appears to replace the user JWT with a service role key (208 chars) that doesn't match the actual `SUPABASE_SERVICE_ROLE_KEY` (219 chars) in the edge function runtime. This is the mismatch causing the 401.

### Solution

Since `verify_jwt = false` is set in config.toml for this function (required for lead-token auth), the function handles its own auth. The fix is to ensure the JWT validation path works correctly when called via `supabase.functions.invoke()`.

**Two changes needed:**

### 1. Remove debug logging (cleanup)

Remove the temporary `console.log` lines added for diagnosis.

### 2. Ensure JWT auth path works with Lovable Cloud proxy

The issue is that Lovable Cloud's proxy may be replacing the user's JWT with a service role key that doesn't match. To handle this gracefully:

- Keep the service role bypass (it's harmless and may be useful later)
- But ensure that when the bypass fails, the JWT validation path still works by also trying to validate the token as a JWT

The current code already does this — the `else if` block calls `supabase.auth.getUser(token)`. So if the proxy sends the service role key and it doesn't match, the code falls through to JWT validation, which would also fail because the service role key isn't a valid JWT.

**The real fix**: The function should try JWT validation regardless of whether the bypass matched, since the token could be either a service role key OR a user JWT:

```typescript
const token = authHeader?.replace('Bearer ', '');

// Allow service_role key (trusted server-to-server call)
if (token && token === serviceRoleKey) {
  // bypass - proceed to URL generation
} else if (token) {
  // Try JWT auth (works for both direct calls and proxy)
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } }
  });
  const { data: claims, error: authError } = await supabase.auth.getUser(token);
  if (!authError && claims?.user) {
    userId = claims.user.id;
  }
}
```

This is essentially what the current code does. The problem is upstream — the proxy is stripping the user's JWT and replacing it with an incorrect service role key.

### Recommended Fix

Since `supabase.functions.invoke()` in Lovable Cloud automatically handles auth, and the function has `verify_jwt = false`, the simplest fix is to **change `verify_jwt` to `true`** for this function and handle lead-token auth separately via a different endpoint. But that would break lead-token auth.

**Alternative (preferred)**: Call the function with an explicit Authorization header containing the user's JWT, bypassing the proxy's key injection:

In `src/hooks/useVideoUpload.ts`, change from:
```typescript
supabase.functions.invoke('r2-get-upload-url', { body: {...} })
```

To explicitly pass the session token:
```typescript
const { data: { session } } = await supabase.auth.getSession();
const response = await fetch(
  `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/r2-get-upload-url`,
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
      'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    },
    body: JSON.stringify({
      file_name: file.name,
      file_size: file.size,
      content_type: file.type,
    }),
  }
);
```

This sends the actual user JWT directly, bypassing any proxy key injection, so `getUser()` in the edge function will succeed.

### Files to Change

1. **`supabase/functions/r2-get-upload-url/index.ts`** -- Remove debug logging
2. **`src/hooks/useVideoUpload.ts`** -- Switch from `supabase.functions.invoke()` to direct `fetch()` with explicit JWT

### After Changes
- Redeploy the edge function
- Test video upload end-to-end

