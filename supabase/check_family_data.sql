-- 家族メンバーのデータ状態を確認

-- 1. household_members テーブルを確認（連携関係）
SELECT 
    hm.household_id,
    hm.user_id,
    hm.role,
    hm.joined_at
FROM household_members hm
ORDER BY joined_at DESC
LIMIT 20;

-- 2. users テーブルの household_id を確認
SELECT 
    id,
    display_name,
    household_id,
    created_at
FROM users
ORDER BY created_at DESC
LIMIT 20;

-- 3. households テーブルを確認
SELECT * FROM households ORDER BY created_at DESC LIMIT 10;

-- 4. 特定のユーザー（あなた）のhousehold_idに紐づくメンバーを確認
-- (自分のhousehold_idがわかれば、それに紐づく全員が見える)
SELECT 
    hm.*,
    u.display_name,
    u.avatar_url
FROM household_members hm
LEFT JOIN users u ON hm.user_id = u.id
WHERE hm.household_id = (
    SELECT household_id FROM users WHERE id = auth.uid()
);
