-- Migration: Add JSONB tags column to cat_images for Hybrid AI Tagging
-- Created: 2026-01-13

-- Add tags column if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cat_images' AND column_name = 'tags') THEN
        ALTER TABLE cat_images ADD COLUMN tags JSONB DEFAULT '[]'::jsonb;
    END IF;
END $$;

-- Add GIN index for efficient searching within JSONB array
CREATE INDEX IF NOT EXISTS idx_cat_images_tags_gin ON cat_images USING GIN (tags);

-- Comment for documentation
COMMENT ON COLUMN cat_images.tags IS 'Array of tag objects: { "name": string, "isAi": boolean, "confirmed": boolean }';
