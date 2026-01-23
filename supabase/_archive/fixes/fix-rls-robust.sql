-- RLSの再帰や権限問題を根本解決するための堅牢な修正スクリプト
-- SECURITY DEFINER関数を使用して、安全かつ確実に自分のhousehold_idを取得します

-- 1. ヘルパー関数の作成 (SECURITY DEFINER = 管理者権限で実行されるため、テーブルのRLSに影響されない)
CREATE OR REPLACE FUNCTION get_auth_household_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT household_id FROM users WHERE id = auth.uid();
$$;

-- 2. care_logs テーブルのポリシーを関数ベースに更新
ALTER TABLE care_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can insert care_logs to own household" ON care_logs;
DROP POLICY IF EXISTS "Users can select care_logs for own household" ON care_logs;
DROP POLICY IF EXISTS "Users can update care_logs for own household" ON care_logs;
DROP POLICY IF EXISTS "Users can delete care_logs for own household" ON care_logs;

CREATE POLICY "care_logs_select_policy" ON care_logs
    FOR SELECT USING (household_id = get_auth_household_id());

CREATE POLICY "care_logs_insert_policy" ON care_logs
    FOR INSERT WITH CHECK (household_id = get_auth_household_id());

CREATE POLICY "care_logs_update_policy" ON care_logs
    FOR UPDATE USING (household_id = get_auth_household_id());

CREATE POLICY "care_logs_delete_policy" ON care_logs
    FOR DELETE USING (household_id = get_auth_household_id());

-- 3. observations テーブルのポリシーも関数ベースに更新
ALTER TABLE observations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can insert observations for own cats" ON observations;
DROP POLICY IF EXISTS "Users can select observations for own cats" ON observations;

-- 猫のチェックも関数を使ってシンプルに
CREATE POLICY "observations_select_policy" ON observations
    FOR SELECT USING (
        cat_id IN (SELECT id FROM cats WHERE household_id = get_auth_household_id())
    );

CREATE POLICY "observations_insert_policy" ON observations
    FOR INSERT WITH CHECK (
        cat_id IN (SELECT id FROM cats WHERE household_id = get_auth_household_id())
    );

-- 4. cats, inventory も同様に保護（念のため）
CREATE POLICY "cats_select_policy" ON cats
    FOR SELECT USING (household_id = get_auth_household_id());

CREATE POLICY "inventory_select_policy" ON inventory
    FOR SELECT USING (household_id = get_auth_household_id());

-- 完了確認
SELECT 'Robust RLS fix applied using security definer function' as result;
