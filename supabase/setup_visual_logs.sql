-- Add images column to observations if not exists
ALTER TABLE observations ADD COLUMN IF NOT EXISTS images TEXT[];

-- Add images column to care_logs if not exists
ALTER TABLE care_logs ADD COLUMN IF NOT EXISTS images TEXT[];

-- Create storage bucket 'cat-images' if not exists (This usually requires dashboard or specific storage API, 
-- but we can set up policies assuming it exists. We'll rely on the existing bucket or create one via dashboard if needed, 
-- but for now let's assume 'cat-images' or reuse 'avatars' with a prefix? 
-- The plan mentions `cat-photos/{catId}...`. Let's assume we use a bucket named 'cat-images' or similar.
-- For simplicity in SQL, we just define policies. 
-- Actually, let's stick to the SQL policies for the tables first.)

-- Add "Daily Snap" (今日の一枚) to notice_defs
-- Check if it exists for each household, if not insert it.
-- We can do this with a DO block or just insert for new households later.
-- For existing households, let's try to insert it.

DO $$
DECLARE
    household_rec RECORD;
BEGIN
    FOR household_rec IN SELECT id FROM households WHERE deleted_at IS NULL LOOP
        IF NOT EXISTS (
            SELECT 1 FROM notice_defs 
            WHERE household_id = household_rec.id 
            AND title = '今日の一枚'
        ) THEN
            INSERT INTO notice_defs (household_id, title, kind, cadence, choices, input_type, category, required, enabled, optional)
            VALUES (
                household_rec.id,
                '今日の一枚',
                'notice',
                'daily',
                ARRAY['撮影した'],
                'photo', -- New input_type 'photo'
                'memory', -- New category 'memory'
                false,
                true,
                true
            );
        END IF;
    END LOOP;
END $$;
