-- Ensure columns exist in cats table
ALTER TABLE cats ADD COLUMN IF NOT EXISTS background_mode text DEFAULT 'random';
ALTER TABLE cats ADD COLUMN IF NOT EXISTS background_media text;

-- Drop function to allow changes
DROP FUNCTION IF EXISTS get_all_cats(uuid);

-- Re-create function with explicit column selection to ensure they are returned
-- Using VOLATILE to avoid aggressive caching
CREATE OR REPLACE FUNCTION get_all_cats(target_household_id uuid)
RETURNS json
LANGUAGE sql
VOLATILE
SECURITY DEFINER
AS $$
  SELECT COALESCE(json_agg(t), '[]'::json)
  FROM (
      SELECT *
      FROM cats
      WHERE household_id = target_household_id
      AND deleted_at IS NULL
      ORDER BY created_at ASC
  ) t;
$$;
