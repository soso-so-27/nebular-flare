-- 完全なRLSポリシー設定（オンボーディングフロー対応）
-- Supabase SQL Editorで実行してください

-- =====================================================
-- 1. HOUSEHOLDS テーブル
-- =====================================================
-- 既存のポリシーを削除
DROP POLICY IF EXISTS "Authenticated users can create households" ON households;
DROP POLICY IF EXISTS "Users can view their household" ON households;
DROP POLICY IF EXISTS "households_select_own" ON households;
DROP POLICY IF EXISTS "households_insert_authenticated" ON households;

-- 認証済みユーザーは世帯を作成できる
CREATE POLICY "households_insert" ON households
    FOR INSERT TO authenticated
    WITH CHECK (true);

-- ユーザーは自分の世帯を参照できる
CREATE POLICY "households_select" ON households
    FOR SELECT TO authenticated
    USING (
        id IN (SELECT household_id FROM users WHERE id = auth.uid())
    );

-- =====================================================
-- 2. USERS テーブル
-- =====================================================
-- 既存のポリシーを削除
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Users can insert own profile" ON users;
DROP POLICY IF EXISTS "Users can view household members" ON users;
DROP POLICY IF EXISTS "users_select_own" ON users;
DROP POLICY IF EXISTS "users_update_own" ON users;
DROP POLICY IF EXISTS "users_insert_own" ON users;
DROP POLICY IF EXISTS "users_select_self" ON users;
DROP POLICY IF EXISTS "users_update_self" ON users;

-- ユーザーは自分のプロファイルを参照できる
CREATE POLICY "users_select" ON users
    FOR SELECT USING (id = auth.uid());

-- ユーザーは自分のプロファイルを更新できる
CREATE POLICY "users_update" ON users
    FOR UPDATE USING (id = auth.uid());

-- ユーザーは自分のプロファイルを作成できる
CREATE POLICY "users_insert" ON users
    FOR INSERT WITH CHECK (id = auth.uid());

-- =====================================================
-- 3. CATS テーブル
-- =====================================================
-- 既存のポリシーを削除
DROP POLICY IF EXISTS "Users can view household cats" ON cats;
DROP POLICY IF EXISTS "Users can insert cats" ON cats;
DROP POLICY IF EXISTS "Users can update cats" ON cats;
DROP POLICY IF EXISTS "cats_select_household" ON cats;
DROP POLICY IF EXISTS "cats_insert_household" ON cats;
DROP POLICY IF EXISTS "cats_update_household" ON cats;

-- ユーザーは自分の世帯の猫を参照できる
CREATE POLICY "cats_select" ON cats
    FOR SELECT TO authenticated
    USING (
        household_id IN (SELECT household_id FROM users WHERE id = auth.uid())
    );

-- ユーザーは自分の世帯に猫を追加できる
CREATE POLICY "cats_insert" ON cats
    FOR INSERT TO authenticated
    WITH CHECK (
        household_id IN (SELECT household_id FROM users WHERE id = auth.uid())
        OR 
        -- 新規世帯作成時はhousehold_idがusersテーブルにまだない可能性がある
        -- その場合、householdsテーブルからアクセス
        household_id IN (SELECT id FROM households)
    );

-- ユーザーは自分の世帯の猫を更新できる
CREATE POLICY "cats_update" ON cats
    FOR UPDATE TO authenticated
    USING (
        household_id IN (SELECT household_id FROM users WHERE id = auth.uid())
    );

-- =====================================================
-- 4. INVENTORY テーブル
-- =====================================================
DROP POLICY IF EXISTS "Users can view household inventory" ON inventory;
DROP POLICY IF EXISTS "Users can insert inventory" ON inventory;
DROP POLICY IF EXISTS "inventory_select_household" ON inventory;
DROP POLICY IF EXISTS "inventory_insert_household" ON inventory;
DROP POLICY IF EXISTS "inventory_select" ON inventory;
DROP POLICY IF EXISTS "inventory_insert" ON inventory;

-- ユーザーは自分の世帯の在庫を参照できる
CREATE POLICY "inventory_select" ON inventory
    FOR SELECT TO authenticated
    USING (
        household_id IN (SELECT household_id FROM users WHERE id = auth.uid())
    );

-- ユーザーは自分の世帯に在庫を追加できる（オンボーディング時）
CREATE POLICY "inventory_insert" ON inventory
    FOR INSERT TO authenticated
    WITH CHECK (
        household_id IN (SELECT household_id FROM users WHERE id = auth.uid())
        OR 
        household_id IN (SELECT id FROM households)
    );

-- =====================================================
-- 5. 確認
-- =====================================================
SELECT tablename, policyname, cmd FROM pg_policies 
WHERE tablename IN ('households', 'users', 'cats', 'inventory')
ORDER BY tablename, policyname;
