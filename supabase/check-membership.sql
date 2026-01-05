-- check_membership.sql
-- 現在のユーザーの household_members エントリと、紐づく household_id のメンバー全員を表示します

SELECT 
    auth.uid() as current_user_id,
    (SELECT household_id FROM users WHERE id = auth.uid()) as users_household_id,
    (SELECT count(*) FROM household_members WHERE user_id = auth.uid()) as members_entry_count;

-- メンバー情報の詳細取得 (RPCと同じロジックの確認)
SELECT 
    hm.user_id,
    hm.role,
    hm.household_id
FROM household_members hm
WHERE hm.household_id IN (SELECT household_id FROM users WHERE id = auth.uid());
