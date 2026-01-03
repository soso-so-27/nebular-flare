-- =====================================================
-- CatUp RLSポリシー クリーンアップ Part 3
-- 重複・競合ポリシーを削除
-- Supabase SQL Editorで実行してください
-- =====================================================

-- =====================================================
-- STEP 1: 重複ポリシーの削除
-- =====================================================

-- cats テーブルの重複ポリシー削除
DROP POLICY IF EXISTS "authenticated_all" ON cats;

-- observations テーブルの重複ポリシー削除  
DROP POLICY IF EXISTS "authenticated_all" ON observations;
DROP POLICY IF EXISTS "Users can insert observations for own cats" ON observations;

-- cat_weight_history テーブルの重複ポリシー削除
DROP POLICY IF EXISTS "Users can view weight history of their cats" ON cat_weight_history;

-- =====================================================
-- STEP 2: care_logs テーブルのRLSポリシー確認・修正
-- =====================================================

ALTER TABLE care_logs ENABLE ROW LEVEL SECURITY;

-- 既存ポリシー削除
DROP POLICY IF EXISTS "Users can access household care_logs" ON care_logs;
DROP POLICY IF EXISTS "Users can view household care_logs" ON care_logs;
DROP POLICY IF EXISTS "Users can insert household care_logs" ON care_logs;
DROP POLICY IF EXISTS "Users can update household care_logs" ON care_logs;
DROP POLICY IF EXISTS "authenticated_all" ON care_logs;

-- household_members 経由でシンプルなポリシー
CREATE POLICY "allow_select_care_logs" ON care_logs
    FOR SELECT TO authenticated
    USING (
        household_id IN (
            SELECT household_id FROM household_members WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "allow_insert_care_logs" ON care_logs
    FOR INSERT TO authenticated
    WITH CHECK (
        household_id IN (
            SELECT household_id FROM household_members WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "allow_update_care_logs" ON care_logs
    FOR UPDATE TO authenticated
    USING (
        household_id IN (
            SELECT household_id FROM household_members WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "allow_delete_care_logs" ON care_logs
    FOR DELETE TO authenticated
    USING (
        household_id IN (
            SELECT household_id FROM household_members WHERE user_id = auth.uid()
        )
    );

-- =====================================================
-- STEP 3: inventory テーブルのRLSポリシー確認・修正
-- =====================================================

ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "allow_select" ON inventory;
DROP POLICY IF EXISTS "allow_insert" ON inventory;
DROP POLICY IF EXISTS "authenticated_all" ON inventory;
DROP POLICY IF EXISTS "Users can access household inventory" ON inventory;
DROP POLICY IF EXISTS "Users can view household inventory" ON inventory;
DROP POLICY IF EXISTS "Users can insert inventory" ON inventory;

CREATE POLICY "allow_select_inventory" ON inventory
    FOR SELECT TO authenticated
    USING (
        household_id IN (
            SELECT household_id FROM household_members WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "allow_insert_inventory" ON inventory
    FOR INSERT TO authenticated
    WITH CHECK (
        household_id IN (
            SELECT household_id FROM household_members WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "allow_update_inventory" ON inventory
    FOR UPDATE TO authenticated
    USING (
        household_id IN (
            SELECT household_id FROM household_members WHERE user_id = auth.uid()
        )
    );

-- =====================================================
-- STEP 4: 最終確認クエリ
-- =====================================================

SELECT tablename, policyname, cmd 
FROM pg_policies 
WHERE tablename IN ('cats', 'cat_weight_history', 'observations', 'household_members', 'care_logs', 'inventory')
ORDER BY tablename, policyname;
