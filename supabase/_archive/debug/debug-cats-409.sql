-- 猫テーブルの制約とデータを確認
-- Supabase SQL Editorで実行してください

-- 1. catsテーブルの制約を確認
SELECT 
    conname AS constraint_name,
    contype AS constraint_type,
    pg_get_constraintdef(oid) AS definition
FROM pg_constraint 
WHERE conrelid = 'cats'::regclass;

-- 2. catsテーブルのインデックスを確認
SELECT 
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'cats';

-- 3. 既存の猫データを確認
SELECT id, household_id, name, created_at FROM cats ORDER BY created_at DESC LIMIT 20;

-- 4. schema.sql の RLS ポリシーが残っている可能性を確認
SELECT policyname, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'cats';
