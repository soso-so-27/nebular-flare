-- RLS Policy修正: 無限再帰問題の解消
-- エラー: 42P17 - infinite recursion detected in policy for relation "users"

-- 既存のusersテーブルのポリシーを削除して再作成
-- 問題: "Users can view household members" が自己参照している

-- Step 1: 全ての既存ポリシーを削除
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Users can insert own profile" ON users;
DROP POLICY IF EXISTS "Users can view household members" ON users;

-- Step 2: 新しいポリシーを作成
-- 自分自身のレコードにアクセス可能（基本）
CREATE POLICY "users_select_own" ON users
    FOR SELECT USING (id = auth.uid());

CREATE POLICY "users_update_own" ON users
    FOR UPDATE USING (id = auth.uid());

CREATE POLICY "users_insert_own" ON users
    FOR INSERT WITH CHECK (id = auth.uid());

-- 注意: 世帯メンバーを見るポリシーは別途追加
-- 無限再帰を避けるため、より単純な条件で
-- 世帯メンバーを見る必要がある場合は、アプリ側でフィルタリング
