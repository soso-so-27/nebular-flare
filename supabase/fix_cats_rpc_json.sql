-- Function to fetch cats returning raw JSON
-- This avoids 'SETOF cats' which might be cached with old column definitions by PostgREST
-- We allow NULL result (if no cats found, json_agg might be null, handled in coalescing)

CREATE OR REPLACE FUNCTION get_all_cats(target_household_id uuid)
RETURNS json
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT COALESCE(json_agg(t), '[]'::json)
  FROM (
      SELECT 
        id, 
        name, 
        age, 
        sex, 
        avatar, 
        birthday, 
        weight, 
        microchip_id, 
        notes,
        background_mode, 
        background_media, 
        household_id, 
        created_at, 
        updated_at, 
        deleted_at
      FROM cats
      WHERE household_id = target_household_id
      AND deleted_at IS NULL
      ORDER BY created_at ASC
  ) t;
$$;
