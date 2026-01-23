-- 1. Create a secure function to get current user's household IDs
-- SECURITY DEFINER means it runs with the privileges of the creator (postgres), bypassing RLS
-- This breaks the infinite loop where household_members policy checks itself
CREATE OR REPLACE FUNCTION get_my_household_ids()
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT household_id FROM household_members WHERE user_id = auth.uid();
$$;

-- 2. Update cat_weight_history policies to use the function (Avoiding recursion)
ALTER TABLE cat_weight_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view weight history for their cats" ON cat_weight_history;
CREATE POLICY "Users can view weight history for their cats"
ON cat_weight_history FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM cats
    WHERE cats.id = cat_weight_history.cat_id
    AND cats.household_id IN (SELECT get_my_household_ids())
  )
);

DROP POLICY IF EXISTS "Users can insert weight history for their cats" ON cat_weight_history;
CREATE POLICY "Users can insert weight history for their cats"
ON cat_weight_history FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM cats
    WHERE cats.id = cat_weight_history.cat_id
    AND cats.household_id IN (SELECT get_my_household_ids())
  )
);

DROP POLICY IF EXISTS "Users can delete weight history for their cats" ON cat_weight_history;
CREATE POLICY "Users can delete weight history for their cats"
ON cat_weight_history FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM cats
    WHERE cats.id = cat_weight_history.cat_id
    AND cats.household_id IN (SELECT get_my_household_ids())
  )
);

-- 3. Update cats UPDATE policy to use the function (Avoiding recursion)
DROP POLICY IF EXISTS "Users can update their household cats" ON cats;
CREATE POLICY "Users can update their household cats"
ON cats FOR UPDATE
USING (
  household_id IN (SELECT get_my_household_ids())
)
WITH CHECK (
  household_id IN (SELECT get_my_household_ids())
);
