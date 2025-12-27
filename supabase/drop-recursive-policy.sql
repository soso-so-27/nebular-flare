-- 問題のポリシーを削除
-- "Users can view household members or self" が無限再帰の原因
DROP POLICY IF EXISTS "Users can view household members or self" ON users;

-- 確認
SELECT policyname FROM pg_policies WHERE tablename = 'users';
