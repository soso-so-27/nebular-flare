-- FIX V5: DEFINITIVE PERMISSION FIX
-- Problem: V4 fixed recursion (500) but caused 403 because the policy logic ran as the user.
-- Solution: Encapsulate the check in a SECURITY DEFINER function so it runs as System, bypassing RLS.

-- 1. Create the Master Check Function (Bypasses ALL RLS)
CREATE OR REPLACE FUNCTION check_cat_permission(target_cat_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER -- Crucial: Runs with creator's privileges
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

-- 2. Apply this function to 'cat_weight_history' (The failing table)
ALTER TABLE cat_weight_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow view weight" ON cat_weight_history;
DROP POLICY IF EXISTS "Allow insert weight" ON cat_weight_history;
DROP POLICY IF EXISTS "Allow delete weight" ON cat_weight_history;

-- Policy simply calls the function (running as System) -> No RLS check on 'cats' needed by User
CREATE POLICY "Allow view weight" ON cat_weight_history FOR SELECT 
USING ( check_cat_permission(cat_id) );

CREATE POLICY "Allow insert weight" ON cat_weight_history FOR INSERT 
WITH CHECK ( check_cat_permission(cat_id) );

CREATE POLICY "Allow delete weight" ON cat_weight_history FOR DELETE 
USING ( check_cat_permission(cat_id) );


-- 3. Apply this function to 'cats' UPDATE (The other potential failing point)
DROP POLICY IF EXISTS "Allow update cats" ON cats;

CREATE POLICY "Allow update cats" ON cats FOR UPDATE
USING ( check_cat_permission(id) )
WITH CHECK ( check_cat_permission(id) );


-- 4. Ensure 'cats' SELECT is safe (V4 approach works here, but function is safer)
DROP POLICY IF EXISTS "Allow view household cats" ON cats;

CREATE POLICY "Allow view household cats" ON cats FOR SELECT
USING ( check_cat_permission(id) );
