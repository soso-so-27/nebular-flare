-- Add memo column to cat_images
ALTER TABLE cat_images ADD COLUMN IF NOT EXISTS memo TEXT;
