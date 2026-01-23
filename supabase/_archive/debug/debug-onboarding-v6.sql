-- 最新のデータを確認（finaltest_v6@example.comの状態）

-- 1. finaltest_v6ユーザーの状態
SELECT 
    u.id,
    au.email,
    u.display_name,
    u.household_id,
    h.name as household_name
FROM public.users u
LEFT JOIN auth.users au ON u.id = au.id
LEFT JOIN public.households h ON u.household_id = h.id
WHERE au.email = 'finaltest_v6@example.com';

-- 2. FinalFamilyというhouseholdは存在するか
SELECT * FROM households WHERE name = 'FinalFamily';

-- 3. Mochiという猫は存在するか
SELECT c.*, h.name as household_name 
FROM cats c
LEFT JOIN households h ON c.household_id = h.id
WHERE c.name = 'Mochi';

-- 4. 最新5件の猫データ
SELECT c.id, c.name, c.household_id, h.name as household_name, c.created_at
FROM cats c
LEFT JOIN households h ON c.household_id = h.id
ORDER BY c.created_at DESC
LIMIT 5;

-- 5. 麦、雨の猫が属するhousehold_id
SELECT c.*, h.name as household_name 
FROM cats c
LEFT JOIN households h ON c.household_id = h.id
WHERE c.name IN ('麦', '雨');
