-- ユーザーテーブルを確認
-- Supabase SQL Editorで実行

-- 1. users テーブルの全データ
SELECT id, household_id, display_name, created_at FROM users ORDER BY created_at DESC LIMIT 10;

-- 2. 今ログインしているユーザーを見つける（認証ユーザーを確認）
-- 以下のIDがusersテーブルにあるか確認してください
-- コンソールログに出ていた: [Onboarding] Starting with user: のIDをここと比較

-- 3. auth.usersテーブル（Supabase認証ユーザー）を確認
SELECT id, email, created_at FROM auth.users ORDER BY created_at DESC LIMIT 10;
