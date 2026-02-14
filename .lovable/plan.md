

## Fix: Service Role Key Bypass in r2-get-upload-url

### Problem
The service role key comparison on line 42 isn't matching, causing 401 responses for trusted proxy calls. The likely cause is either:
- `token` is `undefined` (no auth header) matching against something unexpected
- Missing explicit truthiness check on `token`

### Solution
Update the bypass condition on line 42 to add an explicit `token &&` guard, exactly as you specified:

**File:** `supabase/functions/r2-get-upload-url/index.ts`

**Change (line 42):**
```typescript
// Before:
if (token === serviceRoleKey) {

// After:
if (token && token === serviceRoleKey) {
```

Also remove the `!` non-null assertion on `serviceRoleKey` (line 30) so a missing env var doesn't cause a crash — instead it would just be `undefined` and the comparison would safely fail:

```typescript
// Before:
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// After:
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
```

### After Code Change
- Redeploy the `r2-get-upload-url` edge function

### Technical Details
- The `token && token === serviceRoleKey` pattern ensures we never compare `undefined === undefined`
- Removing the `!` assertion prevents runtime crashes if the env var is missing
- No other files need changes — the bypass logic and ordering are already correct

