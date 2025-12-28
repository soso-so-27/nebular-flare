-- Create cat_images table if not exists
CREATE TABLE IF NOT EXISTS cat_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cat_id UUID NOT NULL REFERENCES cats(id) ON DELETE CASCADE,
    storage_path TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    is_favorite BOOLEAN DEFAULT false,
    width INTEGER,
    height INTEGER
);

-- Enable RLS
ALTER TABLE cat_images ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to handle updates correctly
DROP POLICY IF EXISTS "Users can view images of their household cats" ON cat_images;
DROP POLICY IF EXISTS "Users can insert images for their household cats" ON cat_images;
DROP POLICY IF EXISTS "Users can update images of their household cats" ON cat_images;
DROP POLICY IF EXISTS "Users can delete images of their household cats" ON cat_images;

-- Re-create Policies with correct Household Access Logic
CREATE POLICY "Users can view images of their household cats" ON cat_images
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM cats
            WHERE cats.id = cat_images.cat_id
            AND cats.household_id IN (
                SELECT household_id FROM users WHERE id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can insert images for their household cats" ON cat_images
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM cats
            WHERE cats.id = cat_images.cat_id
            AND cats.household_id IN (
                SELECT household_id FROM users WHERE id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can update images of their household cats" ON cat_images
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM cats
            WHERE cats.id = cat_images.cat_id
            AND cats.household_id IN (
                SELECT household_id FROM users WHERE id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can delete images of their household cats" ON cat_images
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM cats
            WHERE cats.id = cat_images.cat_id
            AND cats.household_id IN (
                SELECT household_id FROM users WHERE id = auth.uid()
            )
        )
    );

-- Note: Storage buckets ('avatars') must be Public or have RLS tailored for Auth Users.
-- Ideally, ensure 'avatars' bucket is Public or access policies are set. 
-- Standard starter template usually sets 'avatars' as public.
