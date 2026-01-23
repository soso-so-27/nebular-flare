-- お世話機能とナビゲーションの不具合を解消するための完全なRLS修正スクリプト
-- このスクリプトをSupabaseのSQL Editorで実行してください

-- トランザクション開始
BEGIN;

-- 1. usersテーブルのポリシー修正
-- household_idの参照を確実にするため、自分自身の読み取りを許可します
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view household members" ON users;
DROP POLICY IF EXISTS "users_select_own" ON users;
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "users_select_self" ON users;
DROP POLICY IF EXISTS "users_update_self" ON users;
DROP POLICY IF EXISTS "users_insert_self" ON users;

CREATE POLICY "users_select_self" ON users
    FOR SELECT USING (id = auth.uid());

CREATE POLICY "users_update_self" ON users
    FOR UPDATE USING (id = auth.uid());

CREATE POLICY "users_insert_self" ON users
    FOR INSERT WITH CHECK (id = auth.uid());

-- 2. catsテーブルのポリシー修正 (ここが欠けていた可能性があります)
-- 猫の情報が見えないと、お世話記録や観察記録の登録に失敗します
ALTER TABLE cats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view household cats" ON cats;
DROP POLICY IF EXISTS "Users can insert household cats" ON cats;
DROP POLICY IF EXISTS "Users can update household cats" ON cats;
DROP POLICY IF EXISTS "Users can access household cats" ON cats;

CREATE POLICY "Users can view household cats" ON cats
    FOR SELECT USING (
        household_id IN (SELECT household_id FROM users WHERE id = auth.uid())
    );

CREATE POLICY "Users can insert household cats" ON cats
    FOR INSERT WITH CHECK (
        household_id IN (SELECT household_id FROM users WHERE id = auth.uid())
    );

CREATE POLICY "Users can update household cats" ON cats
    FOR UPDATE USING (
        household_id IN (SELECT household_id FROM users WHERE id = auth.uid())
    );

-- 3. care_logsテーブルの修正
ALTER TABLE care_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can insert care_logs to own household" ON care_logs;
DROP POLICY IF EXISTS "users_insert_care_logs" ON care_logs;
DROP POLICY IF EXISTS "Users can select care_logs for own household" ON care_logs;
DROP POLICY IF EXISTS "Users can update care_logs for own household" ON care_logs;
DROP POLICY IF EXISTS "Users can delete care_logs for own household" ON care_logs;

CREATE POLICY "Users can select care_logs for own household" ON care_logs
    FOR SELECT USING (
        household_id IN (SELECT household_id FROM users WHERE id = auth.uid())
    );

CREATE POLICY "Users can insert care_logs to own household" ON care_logs
    FOR INSERT WITH CHECK (
        household_id IN (SELECT household_id FROM users WHERE id = auth.uid())
    );
    
CREATE POLICY "Users can update care_logs for own household" ON care_logs
    FOR UPDATE USING (
        household_id IN (SELECT household_id FROM users WHERE id = auth.uid())
    );

CREATE POLICY "Users can delete care_logs for own household" ON care_logs
    FOR DELETE USING (
        household_id IN (SELECT household_id FROM users WHERE id = auth.uid())
    );

-- 4. observationsテーブルの修正
ALTER TABLE observations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can insert observations for own cats" ON observations;
DROP POLICY IF EXISTS "Users can select observations for own cats" ON observations;
DROP POLICY IF EXISTS "Users can update observations for own cats" ON observations;
DROP POLICY IF EXISTS "Users can delete observations for own cats" ON observations;

-- 猫ID（cat_id）に基づいたポリシー
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

CREATE POLICY "Users can update observations for own cats" ON observations
    FOR UPDATE USING (
        cat_id IN (SELECT id FROM cats WHERE household_id IN (
            SELECT household_id FROM users WHERE id = auth.uid()
        ))
    );

CREATE POLICY "Users can delete observations for own cats" ON observations
    FOR DELETE USING (
        cat_id IN (SELECT id FROM cats WHERE household_id IN (
            SELECT household_id FROM users WHERE id = auth.uid()
        ))
    );

COMMIT;

SELECT 'RLS policies completely fixed for users, cats, care_logs, and observations' as status;
