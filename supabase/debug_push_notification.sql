-- ===========================================
-- 通知デバッグ用診断SQL (シンプル版)
-- 各SELECTを個別に実行してください
-- ===========================================

-- 1. observations テーブルのカラム確認
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'observations';

-- 2. users テーブルのカラム確認
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'users';

-- 3. 最新の observation
SELECT * FROM observations ORDER BY id DESC LIMIT 3;

-- 4. Push Tokens (全件)
SELECT * FROM push_tokens;

-- 5. Users (全件)
SELECT * FROM users;

-- 6. Household Members (全件)
SELECT * FROM household_members;
