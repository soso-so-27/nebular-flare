-- 1. Update Bucket Configuration to allow Videos
-- (Depending on how the bucket was created, it might have mime_type restrictions)
UPDATE storage.buckets
SET allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'video/mp4', 'video/webm', 'video/quicktime']
WHERE id = 'avatars';

-- Alternatively, set it to NULL to allow all types (safest for troubleshooting)
UPDATE storage.buckets
SET allowed_mime_types = NULL
WHERE id = 'avatars';

-- 2. Ensure Storage RLS Policies
-- Sometimes specific object policies are missing. Let's add a broad one for 'avatars'.
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload avatars" ON storage.objects;

CREATE POLICY "Users can upload avatars"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'avatars' );

-- Ensure update/delete is also allowed for owners
CREATE POLICY "Users can update their avatars"
ON storage.objects FOR UPDATE
TO authenticated
USING ( bucket_id = 'avatars' AND owner = auth.uid() );

CREATE POLICY "Users can delete their avatars"
ON storage.objects FOR DELETE
TO authenticated
USING ( bucket_id = 'avatars' AND owner = auth.uid() );

-- Ensure public read access (usually redundant but good to verify)
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
TO public
USING ( bucket_id = 'avatars' );
