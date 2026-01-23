-- 問題: usersテーブルのUPDATEが失敗している
-- オンボーディングでhouseholdを作成後、users.household_idの更新ができていない

-- 現在のusersテーブルのポリシーを確認
SELECT policyname, cmd, qual, with_check FROM pg_policies WHERE tablename = 'users';

-- UPDATEポリシーを修正（自分のレコードを更新可能に）
DROP POLICY IF EXISTS "Users can update own profile" ON users;
CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

-- 確認
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'users';
