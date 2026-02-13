

## Fix: Add Shared User Access to r2-get-playback-url

### Problem
The `r2-get-playback-url` edge function checks ownership and funnel relationships, but **never checks the `video_assets_access` table**. Users who have been granted shared access via `video_assets_access` get a 403 "Access denied" error when trying to play videos.

### Current Access Checks
1. Owner (`owner_user_id === userId`) -- works
2. User owns a funnel using the asset -- works
3. Lead token (public viewer) -- works
4. Published funnel -- works
5. **Shared access via `video_assets_access`** -- MISSING

### Fix
Add a shared-access check after the owner/funnel check block (around line 80 in the function). If the authenticated user has an active (non-revoked) record in `video_assets_access`, grant access.

### Technical Details

In `supabase/functions/r2-get-playback-url/index.ts`, after the funnel-owner check block (around line 78), add:

```typescript
// Check if user has shared access via video_assets_access
if (!hasAccess) {
  const { data: accessRecord } = await serviceClient
    .from('video_assets_access')
    .select('id')
    .eq('video_asset_id', asset_id)
    .eq('user_id', userId)
    .is('revoked_at', null)
    .maybeSingle();

  if (accessRecord) {
    hasAccess = true;
    console.log(`Access granted: user ${userId} has shared access to asset ${asset_id}`);
  }
}
```

This block must be placed **inside** the `if (user)` block so `userId` is available, and before the lead-token / published-funnel fallback checks.

### No other files need changes
- The RLS policy already uses `has_video_access()` for SELECT -- this fix aligns the edge function with the database-level access model.
- The `usePlaybackUrl` hook and `ControlledVideoPlayer` component remain unchanged.

