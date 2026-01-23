-- Create cat_images table
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

-- Policies
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

-- Storage Bucket Policy (Assuming 'avatars' bucket or new 'gallery' bucket)
-- We will reuse 'avatars' bucket for simplicity but in a specific folder structure like 'gallery/{cat_id}/...'
