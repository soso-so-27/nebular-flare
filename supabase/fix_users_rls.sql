-- users テーブルの RLS ポリシーを修正
-- 同じ household_id を持つユーザー同士が見えるようにする

-- 現在のRLSポリシーを確認
SELECT 
    schemaname, 
    tablename, 
    policyname, 
    permissive, 
    roles, 
    cmd, 
    qual, 
    with_check 
FROM pg_policies 
WHERE tablename = 'users';

-- 既存のSELECTポリシーを削除して新しく作成
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can view household members" ON users;
DROP POLICY IF EXISTS "Users can see their household members" ON users;

-- 新しいポリシー: 自分自身 OR 同じ世帯のメンバーを見れる
CREATE POLICY "Users can see their household members" ON users
    FOR SELECT
    USING (
        id = auth.uid() 
        OR household_id IN (
            SELECT household_id FROM users WHERE id = auth.uid()
        )
    );

-- 更新ポリシー（自分だけ更新可能）
DROP POLICY IF EXISTS "Users can update own profile" ON users;
CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

SELECT 'RLS policy updated: Users can now see household members' as status;
