-- 1. 関数がpublicスキーマに存在するか確認
SELECT 
    p.proname as function_name,
    n.nspname as schema,
    pg_get_function_arguments(p.oid) as arguments,
    pg_get_function_result(p.oid) as result_type,
    p.prosecdef as is_security_definer
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname = 'fetch_family_members' AND n.nspname = 'public';

-- 2. authenticatedロールに実行権限があるか確認
SELECT grantee, privilege_type
FROM information_schema.routine_privileges
WHERE routine_name = 'fetch_family_members';

-- 3. 実際に呼び出して動くか確認（自分の世帯IDで）
SELECT * FROM fetch_family_members((SELECT household_id FROM users WHERE id = auth.uid()));
