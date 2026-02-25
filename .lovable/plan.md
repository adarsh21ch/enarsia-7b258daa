

# Plan: Sign-In Proxy Edge Function + Fallback Logic

## Problem
The authentication service's `POST /token?grant_type=password` endpoint is not receiving requests from the browser. GET requests and token refreshes work fine, but new password sign-in POST requests hang indefinitely. This affects all your Lovable apps simultaneously, confirming it's a platform-level transport issue.

## Solution
Create a server-side proxy that performs password authentication from within the backend infrastructure (where connectivity is reliable), then feed the tokens back to the client.

## Changes

### 1. New Edge Function: `supabase/functions/sign-in-proxy/index.ts`
- Accepts `{ email, password }` via POST
- Makes a direct `POST /auth/v1/token?grant_type=password` call server-side using the anon key
- Returns the session tokens (`access_token`, `refresh_token`, `user`) to the client
- Includes CORS headers and error handling
- No admin/service role needed -- same security as the browser request, just routed server-side

### 2. Config: `supabase/config.toml`
- Add `[functions.sign-in-proxy]` with `verify_jwt = false` (since the user isn't authenticated yet)

### 3. Update: `src/contexts/AuthContext.tsx`
- Modify `signIn()` to try direct `signInWithPassword()` first with 8-second timeout
- On timeout, automatically fall back to calling the `sign-in-proxy` edge function
- On successful proxy response, use `supabase.auth.setSession()` to apply the tokens
- Log which method succeeded for debugging

## Technical Details

The proxy makes the exact same request the browser would:
```text
Browser (hangs) ──X──> Auth Service /token?grant_type=password
Browser ──> Edge Function ──> Auth Service /token?grant_type=password (works)
```

Edge functions run on the same infrastructure as the auth service, so internal connectivity is reliable. The `setSession()` call on the client applies the tokens identically to a normal sign-in.

## What This Does NOT Change
- No changes to Auth.tsx (already handles timeouts)
- No changes to the service worker
- No database changes
- Existing direct sign-in still works when the platform is healthy -- the proxy is only a fallback

