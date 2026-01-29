-- Migration: Share weekly album settings per household
-- Date: 2026-01-28

-- 1. Add household_id column
ALTER TABLE weekly_album_settings ADD COLUMN IF NOT EXISTS household_id UUID REFERENCES households(id) ON DELETE CASCADE;

-- 2. Populate household_id for existing rows
UPDATE weekly_album_settings w
SET household_id = u.household_id
FROM users u
WHERE w.user_id = u.id AND w.household_id IS NULL;

-- 3. Update unique constraint
-- Note: We drop the old one and create a new one to allow sharing setting for same cat/week
ALTER TABLE weekly_album_settings DROP CONSTRAINT IF EXISTS weekly_album_settings_user_id_cat_id_week_key_key;

-- Ensure we don't have duplicates before adding unique constraint (just in case)
-- (Normally not an issue if this migration runs after populating household_id)
ALTER TABLE weekly_album_settings ADD CONSTRAINT weekly_album_settings_household_id_cat_id_week_key_key UNIQUE(household_id, cat_id, week_key);

-- 4. Update RLS policies
DROP POLICY IF EXISTS "Users can manage their own album settings" ON weekly_album_settings;

CREATE POLICY "Users can manage household album settings" ON weekly_album_settings
  FOR ALL USING (
    household_id IN (
      SELECT household_id FROM users WHERE id = auth.uid()
    )
  );
