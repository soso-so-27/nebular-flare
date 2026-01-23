-- 1. Ensure Columns Exist (Just to be safe)
ALTER TABLE cats ADD COLUMN IF NOT EXISTS background_mode TEXT DEFAULT 'random';
ALTER TABLE cats ADD COLUMN IF NOT EXISTS background_media TEXT;

-- 2. Fill NULL values with default
UPDATE cats SET background_mode = 'random' WHERE background_mode IS NULL;

-- 3. Clean up conflicting UDPATE policies
-- Remove old/duplicate policies to prevent conflicts
DROP POLICY IF EXISTS "Users can update household cats" ON cats;
DROP POLICY IF EXISTS "allow_update_cats" ON cats;
DROP POLICY IF EXISTS "Users can update their household cats" ON cats;

-- 4. Create ONE single, robust UPDATE policy
-- Using household_members is the correct way (supports multi-user families)
CREATE POLICY "Users can update their household cats"
ON cats FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM household_members 
        WHERE household_members.household_id = cats.household_id 
        AND household_members.user_id = auth.uid()
    )
);

-- 5. Clean up SELECT policies if they are also duplicated (Optional but good)
DROP POLICY IF EXISTS "Users can view household cats" ON cats;
DROP POLICY IF EXISTS "allow_select_cats" ON cats;
DROP POLICY IF EXISTS "cats_select_policy" ON cats;
-- Keep/Create standard SELECT policy
CREATE POLICY "Users can view household cats"
ON cats FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM household_members 
        WHERE household_members.household_id = cats.household_id 
        AND household_members.user_id = auth.uid()
    )
);
