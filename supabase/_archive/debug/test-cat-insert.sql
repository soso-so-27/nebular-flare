-- 猫を直接SQLで追加してテスト
-- Supabase SQL Editorで実行してください

-- 1. まず制約を確認
SELECT 
    conname AS constraint_name,
    contype AS constraint_type,
    pg_get_constraintdef(oid) AS definition
FROM pg_constraint 
WHERE conrelid = 'cats'::regclass;

-- 2. インデックスを確認
SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'cats';

-- 3. 最新の世帯IDを取得
SELECT id, name, created_at FROM households ORDER BY created_at DESC LIMIT 3;

-- 4. 実際にテスト用の猫を追加してみる（上で取得した最新の世帯IDに置き換えてください）
-- INSERT INTO cats (household_id, name, avatar) 
-- VALUES ('ここに世帯IDを入れる', 'テスト猫', '🐈');

-- 5. トリガーがあるか確認
SELECT tgname, tgtype, tgfoid::regproc 
FROM pg_trigger 
WHERE tgrelid = 'cats'::regclass;
