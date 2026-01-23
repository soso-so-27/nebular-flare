-- Drop the existing function first to allow return type change
DROP FUNCTION IF EXISTS get_all_cats(uuid);

-- Function to fetch cats returning raw JSON
-- This avoids 'SETOF cats' which might be cached with old column definitions by PostgREST
-- Using SELECT * ensures we get all real columns (including new background ones) 
-- and avoids errors with non-existent columns like 'age'

CREATE OR REPLACE FUNCTION get_all_cats(target_household_id uuid)
RETURNS json
LANGUAGE sql
STABLE
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
