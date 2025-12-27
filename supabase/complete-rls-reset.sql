-- 根本的なRLS問題解決
-- Step 1: 全てのusersテーブルのポリシーを表示してから削除

-- まずポリシー一覧を確認するためのクエリ（先に実行）
-- SELECT policyname FROM pg_policies WHERE tablename = 'users';

-- Step 2: 既知の全てのpoliciesを削除
DROP POLICY IF EXISTS "users_select_own" ON users;
DROP POLICY IF EXISTS "users_update_own" ON users;
DROP POLICY IF EXISTS "users_insert_own" ON users;
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Users can insert own profile" ON users;
DROP POLICY IF EXISTS "Users can view household members" ON users;

-- Step 3: 確認のため再度ポリシー確認
-- SELECT policyname FROM pg_policies WHERE tablename = 'users';

-- 一時的にRLSを無効化（デバッグ用）
-- ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- Step 4: シンプルなポリシーを追加
-- 自分のレコードのみSELECT可能
CREATE POLICY "users_select_own" ON users
    FOR SELECT USING (id = auth.uid());

-- 自分のレコードのみUPDATE可能  
CREATE POLICY "users_update_own" ON users
    FOR UPDATE USING (id = auth.uid());

-- 自分のレコードとしてINSERT可能
CREATE POLICY "users_insert_own" ON users
    FOR INSERT WITH CHECK (id = auth.uid());

-- RLSが有効であることを確認（すでに有効のはず）
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- 確認
SELECT policyname, cmd, qual, with_check FROM pg_policies WHERE tablename = 'users';
