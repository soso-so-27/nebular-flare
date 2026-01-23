-- テーブル定義と制約を確認するスクリプト

-- care_logs テーブルの定義確認
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM 
    information_schema.columns
WHERE 
    table_name = 'care_logs';

-- 外部キー制約の確認
SELECT
    tc.table_schema, 
    tc.constraint_name, 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_schema AS foreign_table_schema,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM 
    information_schema.table_constraints AS tc 
JOIN 
    information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
JOIN 
    information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE 
    tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_name = 'care_logs';

-- ユーザーデータの確認 (Household IDが入っているか、管理者権限で全件数とnullの数などを確認)
SELECT 
    count(*) as total_users,
    count(household_id) as users_with_household,
    count(*) - count(household_id) as users_without_household
FROM 
    users;
