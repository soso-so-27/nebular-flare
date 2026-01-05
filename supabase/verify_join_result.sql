-- 招待後の状態確認

-- 1. household_members テーブルにデータが入ったか確認
SELECT 
    hm.household_id,
    hm.user_id,
    hm.role,
    hm.joined_at,
    u.display_name
FROM household_members hm
LEFT JOIN users u ON hm.user_id = u.id
ORDER BY hm.joined_at DESC
LIMIT 20;

-- 2. users テーブルの household_id が正しく更新されたか確認
SELECT 
    id,
    display_name,
    household_id
FROM users
ORDER BY created_at DESC
LIMIT 20;

-- 3. 同じ household_id を持つユーザーをグルーピングして確認
SELECT 
    household_id,
    array_agg(display_name) as members,
    COUNT(*) as member_count
FROM users
WHERE household_id IS NOT NULL
GROUP BY household_id
ORDER BY member_count DESC;
