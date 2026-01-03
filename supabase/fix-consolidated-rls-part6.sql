-- =====================================================
-- CatUp RLS 無限再帰修正 Part 6
-- household_members の無限再帰ポリシーを修正
-- Supabase SQL Editorで実行してください
-- =====================================================

-- =====================================================
-- 問題: household_members の view_members ポリシーが
-- household_members 自身をサブクエリで参照していたため
-- 無限再帰が発生
-- 
-- 解決: auth.uid() のみを使用したシンプルなポリシーに変更
-- =====================================================

-- STEP 1: household_members のポリシーを削除して再作成
DROP POLICY IF EXISTS "view_members" ON household_members;
DROP POLICY IF EXISTS "join_households" ON household_members;

-- ユーザーは自分のメンバーシップを見れる（自分のuser_idに基づく）
CREATE POLICY "view_members" ON household_members
    FOR SELECT TO authenticated
    USING (
        -- 自分が所属するhouseholdのメンバーを見れる
        -- 自分自身のレコードを基準にする（再帰なし）
        user_id = auth.uid()
        OR
        household_id IN (
            SELECT hm.household_id 
            FROM household_members hm 
            WHERE hm.user_id = auth.uid()
        )
    );

-- 上記はまだ再帰の可能性があるため、より安全なバージョン:
-- 一度削除してSECURITY DEFINERを使った関数で回避
DROP POLICY IF EXISTS "view_members" ON household_members;

-- SECURITY DEFINER関数を作成（RLSをバイパス）
CREATE OR REPLACE FUNCTION get_my_households()
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT household_id FROM household_members WHERE user_id = auth.uid();
$$;

-- シンプルなポリシー（関数を使用）
CREATE POLICY "view_members" ON household_members
    FOR SELECT TO authenticated
    USING (
        household_id IN (SELECT get_my_households())
    );

-- 新規メンバー追加（招待コードで参加する場合）
CREATE POLICY "join_households" ON household_members
    FOR INSERT TO authenticated
    WITH CHECK (
        user_id = auth.uid()
    );

-- =====================================================
-- STEP 2: 他のテーブルも同じ関数を使用するように更新
-- =====================================================

-- cats
DROP POLICY IF EXISTS "allow_select_cats" ON cats;
DROP POLICY IF EXISTS "allow_insert_cats" ON cats;
DROP POLICY IF EXISTS "allow_update_cats" ON cats;

CREATE POLICY "allow_select_cats" ON cats
    FOR SELECT TO authenticated
    USING ( household_id IN (SELECT get_my_households()) );

CREATE POLICY "allow_insert_cats" ON cats
    FOR INSERT TO authenticated
    WITH CHECK ( household_id IN (SELECT get_my_households()) );

CREATE POLICY "allow_update_cats" ON cats
    FOR UPDATE TO authenticated
    USING ( household_id IN (SELECT get_my_households()) );

-- care_logs
DROP POLICY IF EXISTS "allow_select_care_logs" ON care_logs;
DROP POLICY IF EXISTS "allow_insert_care_logs" ON care_logs;
DROP POLICY IF EXISTS "allow_update_care_logs" ON care_logs;
DROP POLICY IF EXISTS "allow_delete_care_logs" ON care_logs;

CREATE POLICY "allow_select_care_logs" ON care_logs
    FOR SELECT TO authenticated
    USING ( household_id IN (SELECT get_my_households()) );

CREATE POLICY "allow_insert_care_logs" ON care_logs
    FOR INSERT TO authenticated
    WITH CHECK ( household_id IN (SELECT get_my_households()) );

CREATE POLICY "allow_update_care_logs" ON care_logs
    FOR UPDATE TO authenticated
    USING ( household_id IN (SELECT get_my_households()) );

CREATE POLICY "allow_delete_care_logs" ON care_logs
    FOR DELETE TO authenticated
    USING ( household_id IN (SELECT get_my_households()) );

-- inventory
DROP POLICY IF EXISTS "allow_select_inventory" ON inventory;
DROP POLICY IF EXISTS "allow_insert_inventory" ON inventory;
DROP POLICY IF EXISTS "allow_update_inventory" ON inventory;

CREATE POLICY "allow_select_inventory" ON inventory
    FOR SELECT TO authenticated
    USING ( household_id IN (SELECT get_my_households()) );

CREATE POLICY "allow_insert_inventory" ON inventory
    FOR INSERT TO authenticated
    WITH CHECK ( household_id IN (SELECT get_my_households()) );

CREATE POLICY "allow_update_inventory" ON inventory
    FOR UPDATE TO authenticated
    USING ( household_id IN (SELECT get_my_households()) );

-- =====================================================
-- STEP 3: cat_id 経由のテーブル用の関数
-- =====================================================

CREATE OR REPLACE FUNCTION get_my_cat_ids()
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT c.id FROM cats c WHERE c.household_id IN (SELECT get_my_households());
$$;

-- observations
DROP POLICY IF EXISTS "allow_select_observations" ON observations;
DROP POLICY IF EXISTS "allow_insert_observations" ON observations;
DROP POLICY IF EXISTS "allow_update_observations" ON observations;
DROP POLICY IF EXISTS "allow_delete_observations" ON observations;

CREATE POLICY "allow_select_observations" ON observations
    FOR SELECT TO authenticated
    USING ( cat_id IN (SELECT get_my_cat_ids()) );

CREATE POLICY "allow_insert_observations" ON observations
    FOR INSERT TO authenticated
    WITH CHECK ( cat_id IN (SELECT get_my_cat_ids()) );

CREATE POLICY "allow_update_observations" ON observations
    FOR UPDATE TO authenticated
    USING ( cat_id IN (SELECT get_my_cat_ids()) );

CREATE POLICY "allow_delete_observations" ON observations
    FOR DELETE TO authenticated
    USING ( cat_id IN (SELECT get_my_cat_ids()) );

-- cat_weight_history
DROP POLICY IF EXISTS "allow_select_weight" ON cat_weight_history;
DROP POLICY IF EXISTS "allow_insert_weight" ON cat_weight_history;
DROP POLICY IF EXISTS "allow_delete_weight" ON cat_weight_history;

CREATE POLICY "allow_select_weight" ON cat_weight_history
    FOR SELECT TO authenticated
    USING ( cat_id IN (SELECT get_my_cat_ids()) );

CREATE POLICY "allow_insert_weight" ON cat_weight_history
    FOR INSERT TO authenticated
    WITH CHECK ( cat_id IN (SELECT get_my_cat_ids()) );

CREATE POLICY "allow_delete_weight" ON cat_weight_history
    FOR DELETE TO authenticated
    USING ( cat_id IN (SELECT get_my_cat_ids()) );

-- =====================================================
-- STEP 4: 確認クエリ
-- =====================================================

SELECT tablename, policyname, cmd 
FROM pg_policies 
WHERE tablename IN ('cats', 'cat_weight_history', 'observations', 'household_members', 'care_logs', 'inventory')
ORDER BY tablename, policyname;
