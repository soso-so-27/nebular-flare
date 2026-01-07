-- Force ensure columns exist
ALTER TABLE cats ADD COLUMN IF NOT EXISTS background_mode TEXT DEFAULT 'random';
ALTER TABLE cats ADD COLUMN IF NOT EXISTS background_media TEXT;

-- Drop and Re-create Update Policy to ensure it covers new columns
DROP POLICY IF EXISTS "Users can update their household cats" ON cats;

CREATE POLICY "Users can update their household cats"
ON cats FOR UPDATE
USING (
    household_id IN (
        SELECT household_id FROM household_members WHERE user_id = auth.uid()
    )
);

-- Ensure storage bucket 'avatars' (used for bg) is public and writable
-- (Assuming standard public access is already set, but verifying RLS for objects)
-- We won't touch storage policies blindly, assuming image upload worked before.
