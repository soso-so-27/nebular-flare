-- Add created_by column to cat_images if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cat_images' AND column_name = 'created_by') THEN
        ALTER TABLE cat_images ADD COLUMN created_by uuid DEFAULT auth.uid();
    END IF;
END $$;

-- Update existing rows to have a default (optional, maybe set to current user or null)
-- If we want to be safe, we can leave them null or set to a specific ID if known.
-- For now, default auth.uid() handles new inserts. 
