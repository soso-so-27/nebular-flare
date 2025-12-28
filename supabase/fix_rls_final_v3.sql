-- FINAL FIX FOR RLS RECURSION AND PERMISSIONS
-- This script cleans up ALL potentially recursive policies and resets them to a safe state.

-- 1. FIX "users" TABLE RECURSION (Critical source of 500 Errors)
-- The original schema likely had a policy checking 'users' recursively. We remove it.
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own household" ON users;
DROP POLICY IF EXISTS "Users can view household members" ON users;
DROP POLICY IF EXISTS "Users can access household cats" ON cats; -- Old policy name on cats

-- Replace with simple, non-recursive policy
CREATE POLICY "Users can view own profile" 
ON users FOR SELECT 
USING (auth.uid() = id);

-- 2. CREATE HELPER FUNCTION (Bypasses RLS safely)
CREATE OR REPLACE FUNCTION check_user_can_manage_cat(target_cat_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
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

-- 3. FIX "cats" TABLE
ALTER TABLE cats ENABLE ROW LEVEL SECURITY;

-- Remove ALL variations of update policies
DROP POLICY IF EXISTS "Users can update their household cats" ON cats;
DROP POLICY IF EXISTS "Allow update cats" ON cats;

-- Allow Update via the secure function
CREATE POLICY "Allow update cats"
ON cats FOR UPDATE
USING ( check_user_can_manage_cat(id) )
WITH CHECK ( check_user_can_manage_cat(id) );

-- Allow Select (using household_members directly to avoid 'users' table recursion)
DROP POLICY IF EXISTS "Users can access household cats" ON cats;
CREATE POLICY "Allow view household cats"
ON cats FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM household_members hm
    WHERE hm.household_id = cats.household_id
    AND hm.user_id = auth.uid()
  )
);

-- 4. FIX "cat_weight_history" TABLE
ALTER TABLE cat_weight_history ENABLE ROW LEVEL SECURITY;

-- Clean slate
DROP POLICY IF EXISTS "Users can view weight history for their cats" ON cat_weight_history;
DROP POLICY IF EXISTS "Users can insert weight history for their cats" ON cat_weight_history;
DROP POLICY IF EXISTS "Users can delete weight history for their cats" ON cat_weight_history;
DROP POLICY IF EXISTS "Allow view weight" ON cat_weight_history;
DROP POLICY IF EXISTS "Allow insert weight" ON cat_weight_history;
DROP POLICY IF EXISTS "Allow delete weight" ON cat_weight_history;

-- Apply Secure Policies
CREATE POLICY "Allow view weight" 
ON cat_weight_history FOR SELECT 
USING ( check_user_can_manage_cat(cat_id) );

CREATE POLICY "Allow insert weight" 
ON cat_weight_history FOR INSERT 
WITH CHECK ( check_user_can_manage_cat(cat_id) );

CREATE POLICY "Allow delete weight" 
ON cat_weight_history FOR DELETE 
USING ( check_user_can_manage_cat(cat_id) );
