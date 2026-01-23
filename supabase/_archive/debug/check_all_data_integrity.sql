-- COMPREHENSIVE DATA INTEGRITY CHECK
-- Checks for "Orphaned" integrations and RLS-blocking disconnects across all tables.

-- 1. USER-HOUSEHOLD MISMATCH (The "Ghost Member" Problem)
-- Users who have a household_id in 'users' table but are NOT in 'household_members' table.
-- (This causes the app to think they have a home, but RLS blocks their access)
SELECT 
    'USER_MEMBER_MISMATCH' as check_type,
    u.id as user_id,
    u.display_name,
    u.household_id as target_household_id
FROM users u
WHERE u.household_id IS NOT NULL
AND NOT EXISTS (
    SELECT 1 FROM household_members hm 
    WHERE hm.user_id = u.id AND hm.household_id = u.household_id
);

-- 2. ORPHANED CATS
-- Cats that belong to a household that exists, but the current user (you) cannot see them
-- (This checks if RLS is working correctly for cats vs members)
SELECT 
    'ORPHANED_CAT' as check_type,
    c.id as cat_id,
    c.name,
    c.household_id
FROM cats c
LEFT JOIN households h ON c.household_id = h.id
WHERE h.id IS NULL; -- Cat points to non-existent household

-- 3. INVALID INVENTORY
-- Inventory items pointing to non-existent households
SELECT 
    'ORPHANED_INVENTORY' as check_type,
    i.id as item_id,
    i.label,
    i.household_id
FROM inventory i
LEFT JOIN households h ON i.household_id = h.id
WHERE h.id IS NULL;

-- 4. INVALID LOGS (Care Logs)
SELECT 
    'ORPHANED_CARE_LOG' as check_type,
    cl.id as log_id,
    cl.type,
    cl.household_id
FROM care_logs cl
LEFT JOIN households h ON cl.household_id = h.id
WHERE h.id IS NULL;

-- 5. FUNCTION TEST (Permission Function)
-- Verify that the helper function actually returns TRUE for one of your known cats.
-- Replace 'YOUR_USER_ID' implicitly by running as current user, but we can list all cats vs permissions.
-- We will list cats that belong to households you are a member of, but the function returns false (Logical Error)
SELECT 
    'PERMISSION_FUNCTION_FAILURE' as check_type,
    c.id as cat_id, 
    c.name,
    hm.user_id as should_have_access_user
FROM cats c
JOIN household_members hm ON c.household_id = hm.household_id
WHERE NOT check_cat_permission(c.id) -- Function returns FALSE despite member match
AND hm.user_id = auth.uid(); 
