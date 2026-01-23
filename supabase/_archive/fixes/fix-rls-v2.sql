-- 追加の RLS Policies v2 - Onboarding Flow Fixes
-- 既存のPolicyとの競合を避けるため新しいPolicyを追加

-- ========================================
-- Users テーブル: 自分自身のレコードにアクセス可能にする
-- ========================================

-- 自分自身のレコードを読める（新規登録時にhousehold_idがNULLでも）
CREATE POLICY "Users can view own profile" ON users
    FOR SELECT USING (id = auth.uid());

-- 自分自身のレコードを更新できる
CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE USING (id = auth.uid());

-- 新規ユーザー登録時に自分のレコードを作成できる
CREATE POLICY "Users can insert own profile" ON users
    FOR INSERT WITH CHECK (id = auth.uid());

-- ========================================
-- Households テーブル: 認証済みユーザーがINSERTできるように
-- ========================================

-- 認証済みユーザーは世帯を作成できる
CREATE POLICY "Authenticated users can create households" ON households
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- 自分が所属する世帯を参照できる（元のALLポリシーと重複する可能性があるが安全策として）
CREATE POLICY "Users can select own household" ON households
    FOR SELECT USING (id IN (
        SELECT household_id FROM users WHERE id = auth.uid()
    ));

-- ========================================
-- Cats テーブル: INSERTポリシー
-- ========================================

-- 自分の世帯に猫を追加できる
CREATE POLICY "Users can insert cats to own household" ON cats
    FOR INSERT WITH CHECK (
        household_id IN (SELECT household_id FROM users WHERE id = auth.uid())
    );

-- ========================================
-- Inventory テーブル: INSERTポリシー
-- ========================================

-- 自分の世帯に在庫を追加できる
CREATE POLICY "Users can insert inventory to own household" ON inventory
    FOR INSERT WITH CHECK (
        household_id IN (SELECT household_id FROM users WHERE id = auth.uid())
    );

-- ========================================
-- Care Logs テーブル: INSERTポリシー
-- ========================================

-- 自分の世帯にログを追加できる
CREATE POLICY "Users can insert care_logs to own household" ON care_logs
    FOR INSERT WITH CHECK (
        household_id IN (SELECT household_id FROM users WHERE id = auth.uid())
    );

-- ========================================
-- Observations テーブル: INSERTポリシー
-- ========================================

-- 自分の世帯の猫に観察を追加できる
CREATE POLICY "Users can insert observations for own cats" ON observations
    FOR INSERT WITH CHECK (
        cat_id IN (SELECT id FROM cats WHERE household_id IN (
            SELECT household_id FROM users WHERE id = auth.uid()
        ))
    );
