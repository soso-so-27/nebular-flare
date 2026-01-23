-- 関数が存在するか、引数と戻り値の定義を確認
SELECT 
    n.nspname as schema,
    p.proname as function_name,
    pg_get_function_arguments(p.oid) as arguments,
    pg_get_function_result(p.oid) as result_type
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname = 'fetch_family_members';

-- 試しに実行してみる（任意のhousehold_idを取得してテスト）
DO $$
DECLARE
    dummy_household_id UUID;
BEGIN
    SELECT id INTO dummy_household_id FROM households LIMIT 1;
    
    -- 結果を表示（デバッグ用）
    RAISE NOTICE 'Testing with household_id: %', dummy_household_id;
    
    PERFORM * FROM fetch_family_members(dummy_household_id);
END $$;
