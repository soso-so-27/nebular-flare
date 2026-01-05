-- 現在のRLSポリシーの状態を確認するスクリプト
-- このスクリプトを実行して、テーブルごとのポリシー一覧を取得します。

SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM 
    pg_policies
WHERE 
    tablename IN ('users', 'care_logs', 'observations', 'households', 'cats', 'inventory', 'care_task_defs', 'notice_defs')
ORDER BY 
    tablename,
    cmd;

-- テーブルごとのRLS有効化設定（Row Level Securityが有効か）の確認
SELECT 
    relname AS table_name, 
    relrowsecurity AS rls_enabled
FROM 
    pg_class
JOIN 
    pg_namespace ON pg_namespace.oid = pg_class.relnamespace
WHERE 
    relname IN ('users', 'care_logs', 'observations', 'households', 'cats', 'inventory', 'care_task_defs', 'notice_defs')
    AND nspname = 'public';
