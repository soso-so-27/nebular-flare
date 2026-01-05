-- household_invitesテーブルのRLS状態とポリシーを確認するスクリプト
SELECT 
    t.tablename, 
    t.rowsecurity, 
    p.policyname, 
    p.cmd, 
    p.qual, 
    p.with_check 
FROM pg_tables t
LEFT JOIN pg_policies p ON t.tablename = p.tablename
WHERE t.tablename = 'household_invites';
