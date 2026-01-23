-- =============================================================================
-- RLS (Row Level Security) 監査クエリ
-- =============================================================================
-- Supabase Dashboard > SQL Editor で実行してください
-- 結果を共有いただければ、RLS の問題点を分析します
-- =============================================================================

-- 1. 各テーブルの RLS 有効/無効状態
SELECT 
    schemaname,
    tablename,
    rowsecurity as "RLS有効",
    CASE 
        WHEN rowsecurity THEN '✅ 有効'
        ELSE '❌ 無効（危険）'
    END as "状態"
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN (
    'users',
    'cats', 
    'care_logs',
    'observations',
    'households',
    'household_members',
    'household_invites',
    'inventory',
    'incidents',
    'incident_updates',
    'care_task_defs',
    'notice_defs',
    'push_tokens',
    'cat_images',
    'cat_weight_history',
    'notification_preferences'
)
ORDER BY tablename;

-- 2. 各テーブルに設定されている RLS ポリシー一覧
SELECT 
    schemaname,
    tablename,
    policyname as "ポリシー名",
    permissive as "許可型",
    roles as "対象ロール",
    cmd as "操作",
    qual as "条件(USING)",
    with_check as "挿入条件(WITH CHECK)"
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- 3. RLS が無効なテーブル（危険）
SELECT 
    tablename as "RLS無効テーブル",
    '⚠️ 誰でもアクセス可能' as "警告"
FROM pg_tables 
WHERE schemaname = 'public' 
AND rowsecurity = false
AND tablename NOT IN ('schema_migrations') -- システムテーブル除外
ORDER BY tablename;
