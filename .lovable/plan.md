

## Clean Up Duplicate video_assets SELECT Policies

### What will change
Drop the redundant SELECT policies on the `video_assets` table and keep a single, clean policy that covers both owner access and shared access via `video_assets_access`.

### Steps

1. **Drop existing duplicate SELECT policies**:
   - `video_assets_owner_select`
   - `video_assets_shared_select`
   - `video_assets_select`

2. **Create one unified SELECT policy**:
   ```sql
   CREATE POLICY "Users with access can view video assets"
   ON public.video_assets
   FOR SELECT
   USING (
     auth.uid() = owner_user_id
     OR public.has_video_access(id, auth.uid())
   );
   ```
   This uses the existing `has_video_access` security definer function to avoid any recursion issues and keeps the logic in one place.

### Result
One clear, non-redundant SELECT policy on `video_assets` replacing three overlapping ones. No behavior change -- same access rules, just cleaner.

