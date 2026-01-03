-- =====================================================
-- CatUp 追加RLS修正スクリプト Part 2
-- Supabase SQL Editorで実行してください
-- 作成日: 2026-01-03
-- =====================================================

-- =====================================================
-- STEP 1: check_cat_permission 関数を作成
-- (SECURITY DEFINERでRLSをバイパス)
-- =====================================================

CREATE OR REPLACE FUNCTION check_cat_permission(target_cat_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER -- Crucial: Runs with creator's privileges
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM cats c
    JOIN household_members hm ON c.household_id = hm.household_id
    WHERE c.id = target_cat_id
    AND hm.user_id = auth.uid()
  );
$$;

-- =====================================================
-- STEP 2: cat_weight_history テーブルのRLSポリシー修正
-- =====================================================

ALTER TABLE cat_weight_history ENABLE ROW LEVEL SECURITY;

-- 既存ポリシー全削除
DROP POLICY IF EXISTS "Users can view weight history for their cats" ON cat_weight_history;
DROP POLICY IF EXISTS "Users can insert weight history for their cats" ON cat_weight_history;
DROP POLICY IF EXISTS "Users can delete weight history for their cats" ON cat_weight_history;
DROP POLICY IF EXISTS "Allow view weight" ON cat_weight_history;
DROP POLICY IF EXISTS "Allow insert weight" ON cat_weight_history;
DROP POLICY IF EXISTS "Allow delete weight" ON cat_weight_history;

-- 新しいシンプルなポリシー（check_cat_permission関数を使用）
CREATE POLICY "Allow view weight" ON cat_weight_history 
    FOR SELECT USING ( check_cat_permission(cat_id) );

CREATE POLICY "Allow insert weight" ON cat_weight_history 
    FOR INSERT WITH CHECK ( check_cat_permission(cat_id) );

CREATE POLICY "Allow delete weight" ON cat_weight_history 
    FOR DELETE USING ( check_cat_permission(cat_id) );

-- =====================================================
-- STEP 3: observations テーブルのRLSポリシー再設定
-- (check_cat_permission関数を使用したシンプル版)
-- =====================================================

-- 既存ポリシー削除
DROP POLICY IF EXISTS "allow_select_observations" ON observations;
DROP POLICY IF EXISTS "allow_insert_observations" ON observations;
DROP POLICY IF EXISTS "allow_update_observations" ON observations;
DROP POLICY IF EXISTS "allow_delete_observations" ON observations;
DROP POLICY IF EXISTS "Users can access cat observations" ON observations;
DROP POLICY IF EXISTS "Users can view cat observations" ON observations;
DROP POLICY IF EXISTS "Users can insert cat observations" ON observations;
DROP POLICY IF EXISTS "Users can update cat observations" ON observations;

-- 新しいポリシー（check_cat_permission使用）
CREATE POLICY "allow_select_observations" ON observations
    FOR SELECT TO authenticated
    USING ( check_cat_permission(cat_id) );

CREATE POLICY "allow_insert_observations" ON observations
    FOR INSERT TO authenticated
    WITH CHECK ( check_cat_permission(cat_id) );

CREATE POLICY "allow_update_observations" ON observations
    FOR UPDATE TO authenticated
    USING ( check_cat_permission(cat_id) );

CREATE POLICY "allow_delete_observations" ON observations
    FOR DELETE TO authenticated
    USING ( check_cat_permission(cat_id) );

-- =====================================================
-- STEP 4: cats テーブルのRLSポリシーも統一
-- =====================================================

DROP POLICY IF EXISTS "Allow view household cats" ON cats;
DROP POLICY IF EXISTS "Allow update cats" ON cats;
DROP POLICY IF EXISTS "allow_select" ON cats;
DROP POLICY IF EXISTS "allow_insert" ON cats;
DROP POLICY IF EXISTS "allow_update" ON cats;
DROP POLICY IF EXISTS "Users can access household cats" ON cats;
DROP POLICY IF EXISTS "Users can view household cats" ON cats;
DROP POLICY IF EXISTS "Users can insert household cats" ON cats;
DROP POLICY IF EXISTS "Users can update household cats" ON cats;

CREATE POLICY "allow_select_cats" ON cats
    FOR SELECT TO authenticated
    USING ( check_cat_permission(id) );

CREATE POLICY "allow_insert_cats" ON cats
    FOR INSERT TO authenticated
    WITH CHECK (
        household_id IN (
            SELECT household_id FROM household_members WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "allow_update_cats" ON cats
    FOR UPDATE TO authenticated
    USING ( check_cat_permission(id) )
    WITH CHECK ( check_cat_permission(id) );

-- =====================================================
-- STEP 5: 確認クエリ
-- =====================================================

-- テーブルのポリシー一覧
SELECT tablename, policyname, cmd 
FROM pg_policies 
WHERE tablename IN ('cats', 'cat_weight_history', 'observations', 'household_members')
ORDER BY tablename, policyname;
