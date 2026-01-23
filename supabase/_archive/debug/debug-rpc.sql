-- 関数定義の重複チェック
-- 名前が同じで引数が異なる関数が複数存在すると、RPC呼び出しで400エラーになることがあります

SELECT 
  n.nspname as schema,
  p.proname as function_name,
  pg_get_function_arguments(p.oid) as arguments,
  pg_get_function_result(p.oid) as result_type
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname = 'get_household_members';
