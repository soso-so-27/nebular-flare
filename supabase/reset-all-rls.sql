-- RLSポリシーの完全リセットと再設定
-- Supabase SQL Editorで実行してください

-- =====================================================
-- 1. HOUSEHOLDS テーブルのRLSを一時的に無効化
-- =====================================================
ALTER TABLE households DISABLE ROW LEVEL SECURITY;
ALTER TABLE households ENABLE ROW LEVEL SECURITY;

-- 全ポリシー削除
DROP POLICY IF EXISTS "households_insert" ON households;
DROP POLICY IF EXISTS "households_select" ON households;
DROP POLICY IF EXISTS "Authenticated users can create households" ON households;
DROP POLICY IF EXISTS "Users can view their household" ON households;

-- 新規ポリシー作成
CREATE POLICY "allow_insert" ON households
    FOR INSERT TO authenticated
    WITH CHECK (true);

CREATE POLICY "allow_select" ON households
    FOR SELECT TO authenticated
    USING (true);

-- =====================================================
-- 2. USERS テーブルのRLSを一時的に無効化
-- =====================================================
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- 全ポリシー削除
DROP POLICY IF EXISTS "users_select" ON users;
DROP POLICY IF EXISTS "users_update" ON users;
DROP POLICY IF EXISTS "users_insert" ON users;
DROP POLICY IF EXISTS "users_select_self" ON users;
DROP POLICY IF EXISTS "users_update_self" ON users;
DROP POLICY IF EXISTS "users_insert_own" ON users;
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Users can insert own profile" ON users;
DROP POLICY IF EXISTS "Users can view household members" ON users;

-- 新規ポリシー作成（シンプル版）
CREATE POLICY "allow_select" ON users
    FOR SELECT USING (id = auth.uid());

CREATE POLICY "allow_update" ON users
    FOR UPDATE USING (id = auth.uid());

CREATE POLICY "allow_insert" ON users
    FOR INSERT WITH CHECK (id = auth.uid());

-- =====================================================
-- 3. CATS テーブルのRLSを一時的に無効化
-- =====================================================
ALTER TABLE cats DISABLE ROW LEVEL SECURITY;
ALTER TABLE cats ENABLE ROW LEVEL SECURITY;

-- 全ポリシー削除
DROP POLICY IF EXISTS "cats_select" ON cats;
DROP POLICY IF EXISTS "cats_insert" ON cats;
DROP POLICY IF EXISTS "cats_update" ON cats;
DROP POLICY IF EXISTS "Users can view household cats" ON cats;
DROP POLICY IF EXISTS "Users can insert cats" ON cats;
DROP POLICY IF EXISTS "Users can update cats" ON cats;

-- 新規ポリシー作成（オンボーディング対応）
-- SELECT: 認証済みユーザーは全ての猫を見れる（一時的に緩和）
CREATE POLICY "allow_select" ON cats
    FOR SELECT TO authenticated
    USING (true);

-- INSERT: 認証済みユーザーは猫を追加できる
CREATE POLICY "allow_insert" ON cats
    FOR INSERT TO authenticated
    WITH CHECK (true);

-- UPDATE: 認証済みユーザーは猫を更新できる
CREATE POLICY "allow_update" ON cats
    FOR UPDATE TO authenticated
    USING (true);

-- =====================================================
-- 4. INVENTORY テーブルのRLSを一時的に無効化
-- =====================================================
ALTER TABLE inventory DISABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;

-- 全ポリシー削除
DROP POLICY IF EXISTS "inventory_select" ON inventory;
DROP POLICY IF EXISTS "inventory_insert" ON inventory;
DROP POLICY IF EXISTS "Users can view household inventory" ON inventory;
DROP POLICY IF EXISTS "Users can insert inventory" ON inventory;

-- 新規ポリシー作成
CREATE POLICY "allow_select" ON inventory
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "allow_insert" ON inventory
    FOR INSERT TO authenticated
    WITH CHECK (true);

-- =====================================================
-- 5. 確認
-- =====================================================
SELECT tablename, policyname, cmd 
FROM pg_policies 
WHERE tablename IN ('households', 'users', 'cats', 'inventory')
ORDER BY tablename, policyname;
