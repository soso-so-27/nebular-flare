-- Photo Reactions Table
-- Allows users to add emoji reactions to delivered photos

CREATE TABLE IF NOT EXISTS photo_reactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    image_id UUID NOT NULL REFERENCES cat_images(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    reaction TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(image_id, user_id)
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_photo_reactions_image_id ON photo_reactions(image_id);

-- RLS Policies
ALTER TABLE photo_reactions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for re-running migration)
DROP POLICY IF EXISTS "Users can view reactions for photos in their household" ON photo_reactions;
DROP POLICY IF EXISTS "Users can add their own reactions" ON photo_reactions;
DROP POLICY IF EXISTS "Users can update their own reactions" ON photo_reactions;
DROP POLICY IF EXISTS "Users can delete their own reactions" ON photo_reactions;

-- Anyone in the same household can view reactions
CREATE POLICY "Users can view reactions for photos in their household"
    ON photo_reactions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM cat_images ci
            JOIN cats c ON ci.cat_id = c.id
            JOIN users u ON u.household_id = c.household_id
            WHERE ci.id = photo_reactions.image_id
            AND u.id = auth.uid()
        )
    );

-- Users can add their own reactions
CREATE POLICY "Users can add their own reactions"
    ON photo_reactions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can update their own reactions
CREATE POLICY "Users can update their own reactions"
    ON photo_reactions FOR UPDATE
    USING (auth.uid() = user_id);

-- Users can delete their own reactions
CREATE POLICY "Users can delete their own reactions"
    ON photo_reactions FOR DELETE
    USING (auth.uid() = user_id);
