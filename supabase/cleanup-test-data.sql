-- テストデータのクリーンアップ
-- Supabase SQL Editorで実行してください
-- 注意: 削除前にデータを確認してください

-- 1. 現在のデータを確認
SELECT 'households' as table_name, COUNT(*) as count FROM households
UNION ALL
SELECT 'users', COUNT(*) FROM users
UNION ALL
SELECT 'cats', COUNT(*) FROM cats
UNION ALL
SELECT 'inventory', COUNT(*) FROM inventory
UNION ALL
SELECT 'care_logs', COUNT(*) FROM care_logs
UNION ALL
SELECT 'observations', COUNT(*) FROM observations;

-- 2. 保持したい世帯のIDを確認（必要な世帯のIDをコメントに記録）
-- 例: nakanishisoya@gmail.com の世帯を残したい場合
SELECT h.id, h.name, h.created_at, u.id as user_id, 
       (SELECT email FROM auth.users WHERE id = u.id) as email
FROM households h
LEFT JOIN users u ON u.household_id = h.id
ORDER BY h.created_at DESC;

-- 3. 全てのテストデータを削除（注意: 本番データも消えます！）
-- 必要な世帯ID以外を削除する場合は、以下を編集してください

-- 保持したい世帯のID（ここに残したい世帯IDを入れてください）
-- 例: '8ac0a67f-0adf-4d39-a7ed-58de3a9b718c'

-- まず依存するデータから削除
DELETE FROM observations;
DELETE FROM care_logs;
DELETE FROM inventory;
DELETE FROM cats;
-- usersのhousehold_idをnullに
UPDATE users SET household_id = NULL;
-- 全世帯を削除
DELETE FROM households;

-- 4. 削除後の確認
SELECT 'households' as table_name, COUNT(*) as count FROM households
UNION ALL
SELECT 'users', COUNT(*) FROM users
UNION ALL
SELECT 'cats', COUNT(*) FROM cats
UNION ALL
SELECT 'inventory', COUNT(*) FROM inventory;
