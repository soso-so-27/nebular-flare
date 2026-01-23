-- CRITICAL FIX V4: RESOLVING HOUSEHOLD_MEMBERS INFINITE RECURSION
-- The previous errors confirmed the recursion is in the 'household_members' table itself.
-- We must replace its policy with one that uses a SECURITY DEFINER function to break the loop.

-- 1. Ensure the Helper Function exists and is SECURITY DEFINER
CREATE OR REPLACE FUNCTION get_my_household_ids()
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER -- Bypasses RLS
SET search_path = public
STABLE
AS $$
    SELECT household_id FROM household_members WHERE user_id = auth.uid();
$$;

-- 2. FIX 'household_members' RECURSION (The Root Cause)
ALTER TABLE household_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view members of their household" ON household_members;
DROP POLICY IF EXISTS "Users can join households" ON household_members;
-- Drop any other potential policies
DROP POLICY IF EXISTS "view_members" ON household_members;
DROP POLICY IF EXISTS "join_households" ON household_members;

-- Safe SELECT Policy: Use the function to avoid self-referencing RLS check
CREATE POLICY "Users can view members of their household"
ON household_members FOR SELECT
USING (
    -- User can see themselves
    user_id = auth.uid()
    OR
    -- User can see members of households they belong to (via secure function)
    household_id IN (SELECT get_my_household_ids())
);

-- Safe INSERT Policy
CREATE POLICY "Users can join households"
ON household_members FOR INSERT
WITH CHECK (user_id = auth.uid());


-- 3. RE-APPLY SAFE POLICIES FOR OTHER TABLES (Ensuring Consistency)

-- Users Table
DROP POLICY IF EXISTS "Users can view own household" ON users;
DROP POLICY IF EXISTS "Users can view household members" ON users;
DROP POLICY IF EXISTS "Users can view own profile" ON users;

CREATE POLICY "Users can view own profile" 
ON users FOR SELECT 
USING (auth.uid() = id);

-- Cats Table (Using the helper function directly is cleaner than the check_user_can_manage_cat wrapper for simple selects)
DROP POLICY IF EXISTS "Users can update their household cats" ON cats;
DROP POLICY IF EXISTS "Allow update cats" ON cats;
DROP POLICY IF EXISTS "Users can access household cats" ON cats;
DROP POLICY IF EXISTS "Allow view household cats" ON cats;

CREATE POLICY "Allow view household cats"
ON cats FOR SELECT
USING (
  household_id IN (SELECT get_my_household_ids())
);

CREATE POLICY "Allow update cats"
ON cats FOR UPDATE
USING ( household_id IN (SELECT get_my_household_ids()) )
WITH CHECK ( household_id IN (SELECT get_my_household_ids()) );

-- Cat Weight History
DROP POLICY IF EXISTS "Users can view weight history for their cats" ON cat_weight_history;
DROP POLICY IF EXISTS "Allow view weight" ON cat_weight_history;
DROP POLICY IF EXISTS "Users can insert weight history for their cats" ON cat_weight_history;
DROP POLICY IF EXISTS "Allow insert weight" ON cat_weight_history;
DROP POLICY IF EXISTS "Users can delete weight history for their cats" ON cat_weight_history;
DROP POLICY IF EXISTS "Allow delete weight" ON cat_weight_history;

CREATE POLICY "Allow view weight" 
ON cat_weight_history FOR SELECT 
USING (
    EXISTS (SELECT 1 FROM cats WHERE id = cat_weight_history.cat_id AND household_id IN (SELECT get_my_household_ids()))
);

CREATE POLICY "Allow insert weight" 
ON cat_weight_history FOR INSERT 
WITH CHECK (
    EXISTS (SELECT 1 FROM cats WHERE id = cat_weight_history.cat_id AND household_id IN (SELECT get_my_household_ids()))
);
