-- お世話機能の登録エラーを解消するための包括的なRLS修正スクリプト
-- このスクリプトをSupabaseのSQL Editorで実行してください

-- 1. usersテーブルのポリシーを修正 (これが原因でhousehold_idが取得できず、登録処理が中断されています)
-- 既存の競合するポリシーを削除
DROP POLICY IF EXISTS "Users can view household members" ON users;
DROP POLICY IF EXISTS "users_select_own" ON users;
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "users_select_self" ON users;
DROP POLICY IF EXISTS "users_update_self" ON users;
DROP POLICY IF EXISTS "users_insert_self" ON users;

-- RLSを確実に有効化
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- 最もシンプルで安全な「自分自身のみ参照可能」なポリシーを作成
CREATE POLICY "users_select_self" ON users
    FOR SELECT USING (id = auth.uid());

CREATE POLICY "users_update_self" ON users
    FOR UPDATE USING (id = auth.uid());

CREATE POLICY "users_insert_self" ON users
    FOR INSERT WITH CHECK (id = auth.uid());

-- 2. care_logsテーブルの修正 (RLSが無効になっていたため、有効化して適切な権限を設定)
ALTER TABLE care_logs ENABLE ROW LEVEL SECURITY;

-- 既存ポリシー削除
DROP POLICY IF EXISTS "Users can insert care_logs to own household" ON care_logs;
DROP POLICY IF EXISTS "users_insert_care_logs" ON care_logs;

-- 新規ポリシー作成 (読み取りは自分の世帯、追加も自分の世帯)
CREATE POLICY "Users can select care_logs for own household" ON care_logs
    FOR SELECT USING (
        household_id IN (
            SELECT household_id FROM users WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can insert care_logs to own household" ON care_logs
    FOR INSERT WITH CHECK (
        household_id IN (
            SELECT household_id FROM users WHERE id = auth.uid()
        )
    );
    
CREATE POLICY "Users can update care_logs for own household" ON care_logs
    FOR UPDATE USING (
        household_id IN (
            SELECT household_id FROM users WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can delete care_logs for own household" ON care_logs
    FOR DELETE USING (
        household_id IN (
            SELECT household_id FROM users WHERE id = auth.uid()
        )
    );

-- 3. その他の関連テーブルの整備 (cats, observations)
ALTER TABLE cats ENABLE ROW LEVEL SECURITY;
ALTER TABLE observations ENABLE ROW LEVEL SECURITY;

-- Observationsポリシー
DROP POLICY IF EXISTS "Users can insert observations for own cats" ON observations;
CREATE POLICY "Users can select observations for own cats" ON observations
    FOR SELECT USING (
        cat_id IN (SELECT id FROM cats WHERE household_id IN (
            SELECT household_id FROM users WHERE id = auth.uid()
        ))
    );

CREATE POLICY "Users can insert observations for own cats" ON observations
    FOR INSERT WITH CHECK (
        cat_id IN (SELECT id FROM cats WHERE household_id IN (
            SELECT household_id FROM users WHERE id = auth.uid()
        ))
    );

-- 完了確認
SELECT 'Fixed RLS: Enabled security and updated policies for users, care_logs, cats, observations' as result;
