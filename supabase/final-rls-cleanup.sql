-- 全てのRLSポリシーを削除して再作成
-- Supabase SQL Editorで実行してください

-- =====================================================
-- 1. 全ポリシーの完全削除
-- =====================================================

-- HOUSEHOLDS
DROP POLICY IF EXISTS "Authenticated users can create household" ON households;
DROP POLICY IF EXISTS "Authenticated users can create households" ON households;
DROP POLICY IF EXISTS "Users can view households" ON households;
DROP POLICY IF EXISTS "Users can view their household" ON households;
DROP POLICY IF EXISTS "allow_insert" ON households;
DROP POLICY IF EXISTS "allow_select" ON households;
DROP POLICY IF EXISTS "households_insert" ON households;
DROP POLICY IF EXISTS "households_select" ON households;

-- USERS
DROP POLICY IF EXISTS "allow_insert" ON users;
DROP POLICY IF EXISTS "allow_select" ON users;
DROP POLICY IF EXISTS "allow_update" ON users;
DROP POLICY IF EXISTS "users_insert" ON users;
DROP POLICY IF EXISTS "users_select" ON users;
DROP POLICY IF EXISTS "users_update" ON users;
DROP POLICY IF EXISTS "users_insert_own" ON users;
DROP POLICY IF EXISTS "users_select_self" ON users;
DROP POLICY IF EXISTS "users_select_own" ON users;
DROP POLICY IF EXISTS "users_update_self" ON users;
DROP POLICY IF EXISTS "users_update_own" ON users;
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Users can insert own profile" ON users;
DROP POLICY IF EXISTS "Users can view household members" ON users;

-- CATS
DROP POLICY IF EXISTS "allow_insert" ON cats;
DROP POLICY IF EXISTS "allow_select" ON cats;
DROP POLICY IF EXISTS "allow_update" ON cats;
DROP POLICY IF EXISTS "cats_insert" ON cats;
DROP POLICY IF EXISTS "cats_select" ON cats;
DROP POLICY IF EXISTS "cats_update" ON cats;
DROP POLICY IF EXISTS "Users can insert cats" ON cats;
DROP POLICY IF EXISTS "Users can insert cats to own household" ON cats;
DROP POLICY IF EXISTS "Users can insert household cats" ON cats;
DROP POLICY IF EXISTS "Users can view household cats" ON cats;
DROP POLICY IF EXISTS "Users can update household cats" ON cats;
DROP POLICY IF EXISTS "Users can update cats" ON cats;

-- INVENTORY
DROP POLICY IF EXISTS "allow_insert" ON inventory;
DROP POLICY IF EXISTS "allow_select" ON inventory;
DROP POLICY IF EXISTS "inventory_insert" ON inventory;
DROP POLICY IF EXISTS "inventory_select" ON inventory;
DROP POLICY IF EXISTS "Users can access household inventory" ON inventory;
DROP POLICY IF EXISTS "Users can insert inventory to own household" ON inventory;
DROP POLICY IF EXISTS "Users can view household inventory" ON inventory;
DROP POLICY IF EXISTS "Users can insert inventory" ON inventory;

-- CARE_LOGS
DROP POLICY IF EXISTS "Users can view household care_logs" ON care_logs;
DROP POLICY IF EXISTS "Users can insert care_logs" ON care_logs;
DROP POLICY IF EXISTS "care_logs_select_household" ON care_logs;
DROP POLICY IF EXISTS "care_logs_insert_household" ON care_logs;

-- OBSERVATIONS
DROP POLICY IF EXISTS "Users can view cat observations" ON observations;
DROP POLICY IF EXISTS "Users can insert observations" ON observations;
DROP POLICY IF EXISTS "observations_select_cat" ON observations;
DROP POLICY IF EXISTS "observations_insert_cat" ON observations;

-- =====================================================
-- 2. RLS有効化の確認
-- =====================================================
ALTER TABLE households ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE cats ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE care_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE observations ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 3. シンプルな許可ポリシーを作成（全て認証済みユーザー許可）
-- =====================================================

-- HOUSEHOLDS - 認証済みユーザーは作成・参照可能
CREATE POLICY "authenticated_all" ON households
    FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

-- USERS - 自分自身のみ参照・更新・作成可能
CREATE POLICY "self_all" ON users
    FOR ALL
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

-- CATS - 認証済みユーザーは全て可能
CREATE POLICY "authenticated_all" ON cats
    FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

-- INVENTORY - 認証済みユーザーは全て可能
CREATE POLICY "authenticated_all" ON inventory
    FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

-- CARE_LOGS - 認証済みユーザーは全て可能
CREATE POLICY "authenticated_all" ON care_logs
    FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

-- OBSERVATIONS - 認証済みユーザーは全て可能
CREATE POLICY "authenticated_all" ON observations
    FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

-- =====================================================
-- 4. 確認クエリ
-- =====================================================
SELECT tablename, policyname, cmd 
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
