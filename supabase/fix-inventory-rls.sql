-- =====================================================
-- CatUp Inventory RLS 修正スクリプト
-- Supabase SQL Editorで実行してください
-- =====================================================

-- 問題: household_members テーブルのRLS再帰問題
-- 解決: SECURITY DEFINER関数を使用してhousehold_idを安全に取得

-- =====================================================
-- STEP 1: household_id取得用のヘルパー関数（RLS再帰回避）
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_my_household_ids()
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
    SELECT household_id FROM household_members WHERE user_id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION public.get_my_household_ids() TO authenticated;

-- =====================================================
-- STEP 2: inventory テーブルのRLSポリシーを再作成
-- =====================================================

-- 既存ポリシー削除
DROP POLICY IF EXISTS "allow_select_inventory" ON inventory;
DROP POLICY IF EXISTS "allow_insert_inventory" ON inventory;
DROP POLICY IF EXISTS "allow_update_inventory" ON inventory;
DROP POLICY IF EXISTS "allow_delete_inventory" ON inventory;
DROP POLICY IF EXISTS "Users can access household inventory" ON inventory;
DROP POLICY IF EXISTS "Users can view household inventory" ON inventory;
DROP POLICY IF EXISTS "Users can insert inventory" ON inventory;
DROP POLICY IF EXISTS "Users can insert inventory to own household" ON inventory;
DROP POLICY IF EXISTS "allow_select" ON inventory;
DROP POLICY IF EXISTS "allow_insert" ON inventory;
DROP POLICY IF EXISTS "authenticated_all" ON inventory;

-- RLSを有効化
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;

-- 新しいポリシー作成（SECURITY DEFINER関数を使用）
CREATE POLICY "inventory_select" ON inventory
    FOR SELECT TO authenticated
    USING (household_id IN (SELECT get_my_household_ids()));

CREATE POLICY "inventory_insert" ON inventory
    FOR INSERT TO authenticated
    WITH CHECK (household_id IN (SELECT get_my_household_ids()));

CREATE POLICY "inventory_update" ON inventory
    FOR UPDATE TO authenticated
    USING (household_id IN (SELECT get_my_household_ids()));

CREATE POLICY "inventory_delete" ON inventory
    FOR DELETE TO authenticated
    USING (household_id IN (SELECT get_my_household_ids()));

-- =====================================================
-- STEP 3: 確認クエリ
-- =====================================================

SELECT tablename, policyname, cmd 
FROM pg_policies 
WHERE tablename = 'inventory'
ORDER BY policyname;

-- 動作テスト（現在のユーザーでinventoryを取得できるか）
SELECT id, label, household_id FROM inventory LIMIT 5;
