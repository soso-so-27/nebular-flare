-- Users テーブルに不足しているポリシーのみ追加
-- 既に存在するポリシーはスキップ

-- 自分自身のレコードを読める（新規登録時にhousehold_idがNULLでも）
-- エラーが出たら既に存在するのでOK
CREATE POLICY "Users can view own profile" ON users
    FOR SELECT USING (id = auth.uid());

-- 新規ユーザー登録時に自分のレコードを作成できる
CREATE POLICY "Users can insert own profile" ON users
    FOR INSERT WITH CHECK (id = auth.uid());
