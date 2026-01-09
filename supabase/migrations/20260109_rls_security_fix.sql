-- =============================================================================
-- RLS セキュリティ修正
-- =============================================================================
-- 危険な「全認証ユーザーに全アクセス許可」ポリシーを削除
-- 正しいポリシー（household_id ベース）は残ります
--
-- 背景:
-- final-rls-cleanup.sql で一時的なデバッグ用として作成された
-- authenticated_all, allow_all_* ポリシーが残存していました。
-- これらは IDOR 脆弱性を引き起こすため削除します。
--
-- Supabase Dashboard > SQL Editor で実行してください
-- =============================================================================

-- =====================================================
-- STEP 1: 危険なポリシーの削除
-- =====================================================

-- observations テーブル
-- 削除するもの: allow_all_observations (true) 
-- 残るもの: Users can select/insert/update/delete observations for own cats
DROP POLICY IF EXISTS "allow_all_observations" ON observations;

-- households テーブル
-- 削除するもの: authenticated_all (true)
-- 残るもの: Users can create households, Users can view their own household
DROP POLICY IF EXISTS "authenticated_all" ON households;

-- household_members テーブル
-- 削除するもの: allow_all_members (true)
-- 残るもの: Users can insert membership for self, Users can view members of their household
DROP POLICY IF EXISTS "allow_all_members" ON household_members;

-- =====================================================
-- STEP 2: 確認クエリ
-- =====================================================

-- 削除後のポリシー一覧を確認
SELECT 
    tablename,
    policyname,
    cmd,
    CASE 
        WHEN qual::text = 'true' THEN '⚠️ 危険（全員アクセス可）'
        ELSE '✅ OK'
    END as status
FROM pg_policies 
WHERE tablename IN ('observations', 'households', 'household_members')
ORDER BY tablename, policyname;

-- =====================================================
-- STEP 3: 動作確認用クエリ（オプション）
-- =====================================================

-- 以下のクエリでポリシーが正しく機能するか確認できます:
-- （実行は任意）

-- 自分の household_id を確認
-- SELECT household_id FROM users WHERE id = auth.uid();

-- 自分の猫だけ見えることを確認
-- SELECT * FROM cats LIMIT 5;

-- 観察データが自分の猫のものだけか確認
-- SELECT * FROM observations LIMIT 5;
