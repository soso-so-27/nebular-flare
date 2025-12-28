-- DATA REPAIR SCRIPT
-- Fixes the mismatch where a user has a 'household_id' in the 'users' table
-- but is technically missing from the 'household_members' table (which causes RLS errors).

-- 1. Sync 'users' table household to 'household_members'
-- If a user has a household_id set in 'users' but not in 'household_members', add them.
INSERT INTO household_members (household_id, user_id, role)
SELECT u.household_id, u.id, 'owner'
FROM users u
WHERE u.household_id IS NOT NULL
AND NOT EXISTS (
    SELECT 1 FROM household_members hm 
    WHERE hm.user_id = u.id AND hm.household_id = u.household_id
);

-- 2. (Optional backup) Ensure cat creators are members of the cat's household
-- If the user created a cat, they should definitely be in that cat's household.
INSERT INTO household_members (household_id, user_id, role)
SELECT DISTINCT c.household_id, c.created_by, 'owner'
FROM cats c
WHERE c.created_by IS NOT NULL 
AND c.household_id IS NOT NULL
AND NOT EXISTS (
    SELECT 1 FROM household_members hm 
    WHERE hm.user_id = c.created_by AND hm.household_id = c.household_id
);

-- 3. Verify the Fix
SELECT 
    u.id as user_id,
    u.display_name,
    u.household_id as user_table_household,
    count(hm.household_id) as member_table_entries
FROM users u
LEFT JOIN household_members hm ON u.id = hm.user_id
GROUP BY u.id, u.display_name, u.household_id;
