-- デバッグ: オンボーディングの状態確認

-- 1. 全ユーザーとそのhousehold_idを確認
SELECT 
    u.id,
    au.email,
    u.display_name,
    u.household_id,
    h.name as household_name,
    u.created_at
FROM public.users u
LEFT JOIN auth.users au ON u.id = au.id
LEFT JOIN public.households h ON u.household_id = h.id
ORDER BY u.created_at DESC
LIMIT 10;

-- 2. householdsテーブルで「TestFamily」を検索
SELECT * FROM households WHERE name LIKE '%Test%' ORDER BY created_at DESC LIMIT 5;

-- 3. catsテーブルで「Tama」を検索
SELECT * FROM cats WHERE name LIKE '%Tama%' ORDER BY created_at DESC LIMIT 5;

-- 4. 最新のhouseholdsを確認
SELECT * FROM households ORDER BY created_at DESC LIMIT 5;

-- 5. 最新のcatsを確認
SELECT * FROM cats ORDER BY created_at DESC LIMIT 5;

-- 6. household_idがNULLのユーザー（問題のユーザーを特定）
SELECT 
    u.id,
    au.email,
    u.display_name,
    u.household_id
FROM public.users u
LEFT JOIN auth.users au ON u.id = au.id
WHERE u.household_id IS NULL;
