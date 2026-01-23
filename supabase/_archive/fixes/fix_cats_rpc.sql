-- Function to fetch cats while bypassing PostgREST table schema cache
-- This forces the database to return the current structure of the 'cats' table

CREATE OR REPLACE FUNCTION get_all_cats(target_household_id uuid)
RETURNS SETOF cats
LANGUAGE sql
STABLE
SECURITY DEFINER -- Use definer to ensure access, but we strictly filter by household_id
AS $$
  SELECT *
  FROM cats
  WHERE household_id = target_household_id
  AND deleted_at IS NULL
  ORDER BY created_at ASC;
$$;
