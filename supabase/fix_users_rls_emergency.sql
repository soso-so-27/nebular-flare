-- 緊急修正: RLSポリシーのエラーを修正
-- 再帰問題を避けるため、SECURITY DEFINER関数を使用

-- 1. まず壊れたポリシーを削除
DROP POLICY IF EXISTS "Users can see their household members" ON users;

-- 2. 安全なヘルパー関数を作成
CREATE OR REPLACE FUNCTION get_my_household_id()
RETURNS UUID
SECURITY DEFINER
SET search_path = public, auth
AS $$
    SELECT household_id FROM users WHERE id = auth.uid();
$$ LANGUAGE SQL STABLE;

-- 3. 新しいポリシーを作成（サブクエリの代わりに関数を使用）
CREATE POLICY "Users can see their household members" ON users
    FOR SELECT
    USING (
        id = auth.uid() 
        OR household_id = get_my_household_id()
    );

-- 確認
SELECT 'Emergency RLS fix applied' as status;
