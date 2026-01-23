-- Definitive Fix for RLS Recursion (500 Error) and Permission (403 Error)

-- 1. Create a "Security Definer" function.
-- This function runs with "superuser-like" privileges (bypassing RLS), 
-- allowing us to safely check permissions without triggering infinite loops.
CREATE OR REPLACE FUNCTION check_user_can_manage_cat(target_cat_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER -- Critical: Bypasses RLS to prevent recursion
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM cats c
    JOIN household_members hm ON c.household_id = hm.household_id
    WHERE c.id = target_cat_id
    AND hm.user_id = auth.uid()
  );
$$;

-- 2. Fix policies for Weight History (cat_weight_history)
ALTER TABLE cat_weight_history ENABLE ROW LEVEL SECURITY;

-- Remove old policies to be clean
DROP POLICY IF EXISTS "Users can view weight history for their cats" ON cat_weight_history;
DROP POLICY IF EXISTS "Users can insert weight history for their cats" ON cat_weight_history;
DROP POLICY IF EXISTS "Users can delete weight history for their cats" ON cat_weight_history;
DROP POLICY IF EXISTS "Users can view weight history" ON cat_weight_history; -- Cleanup from potential prior attempts

-- Apply new LOOP-FREE policies
CREATE POLICY "Users can view weight history"
ON cat_weight_history FOR SELECT
USING ( check_user_can_manage_cat(cat_id) );

CREATE POLICY "Users can insert weight history"
ON cat_weight_history FOR INSERT
WITH CHECK ( check_user_can_manage_cat(cat_id) );

CREATE POLICY "Users can delete weight history"
ON cat_weight_history FOR DELETE
USING ( check_user_can_manage_cat(cat_id) );


-- 3. Fix policies for Cats Table (cats) - specifically for UPDATE
-- (SELECT policies are likely already working or handled elsewhere, but UPDATE often has tighter restrictions)

DROP POLICY IF EXISTS "Users can update their household cats" ON cats;

CREATE POLICY "Users can update their household cats"
ON cats FOR UPDATE
USING ( check_user_can_manage_cat(id) )
WITH CHECK ( check_user_can_manage_cat(id) );
