-- 招待Bの household_id を確認

-- 1. 招待B ユーザーの詳細を確認
SELECT 
    id,
    display_name,
    household_id
FROM users
WHERE display_name LIKE '%招待B%';

-- 2. 正しい household の中身を確認（3人いるはずの世帯）
SELECT 
    u.id,
    u.display_name,
    u.household_id
FROM users u
WHERE u.household_id = '76e09899-dbce-4b9f-a3b0-1bfc3dd8cee0';

-- 3. household_members テーブルの状態を確認
SELECT 
    hm.household_id,
    hm.user_id,
    hm.role,
    u.display_name
FROM household_members hm
LEFT JOIN users u ON hm.user_id = u.id
WHERE hm.household_id = '76e09899-dbce-4b9f-a3b0-1bfc3dd8cee0';
