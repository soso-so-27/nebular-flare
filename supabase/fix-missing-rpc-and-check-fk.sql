-- check foreign keys for observations table
SELECT
    tc.table_schema, 
    tc.constraint_name, 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name = 'observations';

-- Create the missing RPC function
DROP FUNCTION IF EXISTS get_household_members(uuid);

CREATE OR REPLACE FUNCTION get_household_members(lookup_household_id UUID)
RETURNS TABLE (
  user_id UUID,
  name TEXT,
  avatar TEXT,
  role TEXT,
  joined_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if the requesting user is a member of the household
  IF NOT EXISTS (
    SELECT 1 FROM household_members
    WHERE household_id = lookup_household_id
    AND user_id = auth.uid()
  ) THEN
    -- Optionally raise an error, or just return empty
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    hm.user_id,
    u.display_name as name,
    u.avatar_url as avatar,
    hm.role,
    hm.joined_at
  FROM household_members hm
  LEFT JOIN users u ON hm.user_id = u.id
  WHERE hm.household_id = lookup_household_id;
END;
$$;
