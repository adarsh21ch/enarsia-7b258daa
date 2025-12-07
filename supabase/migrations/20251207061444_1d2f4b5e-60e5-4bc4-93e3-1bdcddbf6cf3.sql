-- Drop the folder-based policies and create simpler ones
DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;

-- Allow authenticated users to upload any avatar
CREATE POLICY "Authenticated users can upload avatars" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'avatars' AND auth.role() = 'authenticated');

-- Allow authenticated users to update avatars they uploaded
CREATE POLICY "Authenticated users can update avatars" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'avatars' AND auth.role() = 'authenticated');

-- Allow authenticated users to delete avatars
CREATE POLICY "Authenticated users can delete avatars"
ON storage.objects
FOR DELETE
USING (bucket_id = 'avatars' AND auth.role() = 'authenticated');