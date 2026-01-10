-- Enable RLS on storage.objects if not enabled (usually it is)
-- But we need to definePOLICIES for our buckets.

-- 1. cat-images BUCKET
-- Allow INSERT if user is authenticated (we restrict file type/size in client/edge)
-- We could restrict to household, but storage objects don't easy map to household without metadata.
-- Using simple auth checks for now.

BEGIN;

-- Make sure cat-images bucket allows public SELECT (for displaying avatars)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('cat-images', 'cat-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Policy: Give access to authenticated users to upload
CREATE POLICY "Authenticated users can upload cat images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'cat-images');

-- Policy: Give access to owners to update/delete their own
CREATE POLICY "Users can update own cat images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'cat-images' AND owner = auth.uid());

CREATE POLICY "Users can delete own cat images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'cat-images' AND owner = auth.uid());

-- Policy: Public can view (since it's public bucket, this might be redundant but safe)
CREATE POLICY "Public can view cat images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'cat-images');


-- 2. avatars BUCKET (User profiles)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO UPDATE SET public = true;

CREATE POLICY "Authenticated users can upload avatars"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'avatars');

CREATE POLICY "Users can update own avatars"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'avatars' AND owner = auth.uid());

CREATE POLICY "Users can delete own avatars"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'avatars' AND owner = auth.uid());

CREATE POLICY "Public can view avatars"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'avatars');

COMMIT;
