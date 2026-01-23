-- =====================================================
-- CatUp RLS 最終クリーンアップ Part 4
-- Supabase SQL Editorで実行してください
-- =====================================================

-- =====================================================
-- STEP 1: care_logs の重複ポリシー削除
-- =====================================================

DROP POLICY IF EXISTS "Users can insert care_logs to own household" ON care_logs;

-- =====================================================
-- STEP 2: observations テーブルの household_id を確実に同期
-- =====================================================

-- まず observations に household_id カラムがあるか確認し、データを cats から同期
UPDATE observations o
SET household_id = c.household_id
FROM cats c
WHERE o.cat_id = c.id
AND (o.household_id IS NULL OR o.household_id != c.household_id);

-- NOT NULL 制約がない場合は追加（エラーなら無視）
-- ALTER TABLE observations ALTER COLUMN household_id SET NOT NULL;

-- =====================================================
-- STEP 3: observations ポリシーを cat_id ベースに変更
-- (household_id がない場合でも動作するように)
-- =====================================================

DROP POLICY IF EXISTS "allow_select_observations" ON observations;
DROP POLICY IF EXISTS "allow_insert_observations" ON observations;
DROP POLICY IF EXISTS "allow_update_observations" ON observations;
DROP POLICY IF EXISTS "allow_delete_observations" ON observations;

-- check_cat_permission を使用（これは cat_id から household を確認する）
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
-- STEP 4: 確認クエリ
-- =====================================================

-- ポリシー確認
SELECT tablename, policyname, cmd 
FROM pg_policies 
WHERE tablename IN ('cats', 'cat_weight_history', 'observations', 'household_members', 'care_logs', 'inventory')
ORDER BY tablename, policyname;
