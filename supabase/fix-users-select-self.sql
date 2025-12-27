-- デバッグ用: usersテーブルのRLSポリシー確認と修正
-- Supabase SQL Editorで実行

-- 1. 現在のポリシーを確認
SELECT policyname, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'users';

-- 2. 問題の可能性がある既存ポリシーを削除
DROP POLICY IF EXISTS "Users can view household members" ON users;
DROP POLICY IF EXISTS "users_select_own" ON users;
DROP POLICY IF EXISTS "Users can view own profile" ON users;

-- 3. シンプルな自己参照ポリシーを作成（household_idに依存しない）
CREATE POLICY "users_select_self" ON users
    FOR SELECT USING (id = auth.uid());

-- 4. 更新ポリシーも確認・再作成
DROP POLICY IF EXISTS "users_update_own" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;

CREATE POLICY "users_update_self" ON users
    FOR UPDATE USING (id = auth.uid());

-- 5. ポリシー確認
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'users';
