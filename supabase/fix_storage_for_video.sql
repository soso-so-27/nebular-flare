-- 1. Video files (Allow mp4/webm/mov)
UPDATE storage.buckets
SET allowed_mime_types = NULL -- Set to NULL to allow ALL types (safest fix)
WHERE id = 'avatars';

-- 2. Ensure Storage RLS Policies
-- First, drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their avatars" ON storage.objects;

-- Create clean policies
CREATE POLICY "Users can upload avatars"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'avatars' );

CREATE POLICY "Users can update their avatars"
ON storage.objects FOR UPDATE
TO authenticated
USING ( bucket_id = 'avatars' AND owner = auth.uid() );

CREATE POLICY "Users can delete their avatars"
ON storage.objects FOR DELETE
TO authenticated
USING ( bucket_id = 'avatars' AND owner = auth.uid() );

-- Ensure public read access
DROP POLICY IF EXISTS "Give public access to avatars" ON storage.objects;
CREATE POLICY "Give public access to avatars"
ON storage.objects FOR SELECT
TO public
USING ( bucket_id = 'avatars' );
