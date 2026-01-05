-- 招待機能に関連するRPCの存在確認

-- 1. join_household_by_code RPC の存在確認
SELECT 
    p.proname as function_name,
    n.nspname as schema,
    pg_get_function_arguments(p.oid) as arguments,
    pg_get_function_result(p.oid) as result_type
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname IN ('join_household_by_code', 'remove_household_member');

-- 2. household_invites テーブルの中身を確認
SELECT * FROM household_invites ORDER BY created_at DESC LIMIT 20;

-- 3. 現在のauth.uid()を確認（誰としてログインしているか）
SELECT auth.uid() as current_user_id;

-- 4. 自分のusersテーブルエントリを確認
SELECT * FROM users WHERE id = auth.uid();
