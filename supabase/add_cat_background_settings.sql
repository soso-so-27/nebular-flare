-- Add background settings to cats table

-- background_mode: 'random' (default), 'media' (fixed video/image), 'avatar' (fixed avatar)
ALTER TABLE cats 
ADD COLUMN IF NOT EXISTS background_mode TEXT DEFAULT 'random';

-- background_media: Storage path for the fixed background video/image
ALTER TABLE cats 
ADD COLUMN IF NOT EXISTS background_media TEXT;

-- Update RLS policies if necessary (usually covered by existing 'Users can update their household cats')
