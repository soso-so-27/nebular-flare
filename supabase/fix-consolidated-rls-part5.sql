-- =====================================================
-- CatUp RLS 究極シンプル版 Part 5
-- 関数依存を完全に除去したポリシー
-- Supabase SQL Editorで実行してください
-- =====================================================

-- =====================================================
-- STEP 1: 全てのテーブルからポリシーを完全削除して再作成
-- =====================================================

-- ========== cats ==========
DROP POLICY IF EXISTS "allow_select_cats" ON cats;
DROP POLICY IF EXISTS "allow_insert_cats" ON cats;
DROP POLICY IF EXISTS "allow_update_cats" ON cats;

CREATE POLICY "allow_select_cats" ON cats
    FOR SELECT TO authenticated
    USING (
        household_id IN (
            SELECT household_id FROM household_members WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "allow_insert_cats" ON cats
    FOR INSERT TO authenticated
    WITH CHECK (
        household_id IN (
            SELECT household_id FROM household_members WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "allow_update_cats" ON cats
    FOR UPDATE TO authenticated
    USING (
        household_id IN (
            SELECT household_id FROM household_members WHERE user_id = auth.uid()
        )
    );

-- ========== care_logs ==========
DROP POLICY IF EXISTS "allow_select_care_logs" ON care_logs;
DROP POLICY IF EXISTS "allow_insert_care_logs" ON care_logs;
DROP POLICY IF EXISTS "allow_update_care_logs" ON care_logs;
DROP POLICY IF EXISTS "allow_delete_care_logs" ON care_logs;

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

-- ========== inventory ==========
DROP POLICY IF EXISTS "allow_select_inventory" ON inventory;
DROP POLICY IF EXISTS "allow_insert_inventory" ON inventory;
DROP POLICY IF EXISTS "allow_update_inventory" ON inventory;
DROP POLICY IF EXISTS "allow_delete_inventory" ON inventory;

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

-- ========== observations ==========
-- observationsにはhousehold_idがないので cat_id経由でチェック
DROP POLICY IF EXISTS "allow_select_observations" ON observations;
DROP POLICY IF EXISTS "allow_insert_observations" ON observations;
DROP POLICY IF EXISTS "allow_update_observations" ON observations;
DROP POLICY IF EXISTS "allow_delete_observations" ON observations;

CREATE POLICY "allow_select_observations" ON observations
    FOR SELECT TO authenticated
    USING (
        cat_id IN (
            SELECT c.id FROM cats c
            JOIN household_members hm ON c.household_id = hm.household_id
            WHERE hm.user_id = auth.uid()
        )
    );

CREATE POLICY "allow_insert_observations" ON observations
    FOR INSERT TO authenticated
    WITH CHECK (
        cat_id IN (
            SELECT c.id FROM cats c
            JOIN household_members hm ON c.household_id = hm.household_id
            WHERE hm.user_id = auth.uid()
        )
    );

CREATE POLICY "allow_update_observations" ON observations
    FOR UPDATE TO authenticated
    USING (
        cat_id IN (
            SELECT c.id FROM cats c
            JOIN household_members hm ON c.household_id = hm.household_id
            WHERE hm.user_id = auth.uid()
        )
    );

CREATE POLICY "allow_delete_observations" ON observations
    FOR DELETE TO authenticated
    USING (
        cat_id IN (
            SELECT c.id FROM cats c
            JOIN household_members hm ON c.household_id = hm.household_id
            WHERE hm.user_id = auth.uid()
        )
    );

-- ========== cat_weight_history ==========
DROP POLICY IF EXISTS "Allow view weight" ON cat_weight_history;
DROP POLICY IF EXISTS "Allow insert weight" ON cat_weight_history;
DROP POLICY IF EXISTS "Allow delete weight" ON cat_weight_history;

CREATE POLICY "allow_select_weight" ON cat_weight_history
    FOR SELECT TO authenticated
    USING (
        cat_id IN (
            SELECT c.id FROM cats c
            JOIN household_members hm ON c.household_id = hm.household_id
            WHERE hm.user_id = auth.uid()
        )
    );

CREATE POLICY "allow_insert_weight" ON cat_weight_history
    FOR INSERT TO authenticated
    WITH CHECK (
        cat_id IN (
            SELECT c.id FROM cats c
            JOIN household_members hm ON c.household_id = hm.household_id
            WHERE hm.user_id = auth.uid()
        )
    );

CREATE POLICY "allow_delete_weight" ON cat_weight_history
    FOR DELETE TO authenticated
    USING (
        cat_id IN (
            SELECT c.id FROM cats c
            JOIN household_members hm ON c.household_id = hm.household_id
            WHERE hm.user_id = auth.uid()
        )
    );

-- =====================================================
-- STEP 2: 確認クエリ
-- =====================================================

SELECT tablename, policyname, cmd 
FROM pg_policies 
WHERE tablename IN ('cats', 'cat_weight_history', 'observations', 'household_members', 'care_logs', 'inventory')
ORDER BY tablename, policyname;
