-- 特定の記録を論理削除（非表示）にするSQL
-- アプリの仕様に合わせて 'deleted_at' を更新します

UPDATE incidents 
SET deleted_at = NOW() 
WHERE id = '06af46e0-be33-4169-8d46-3897c17f3dce';

-- 削除されたことを確認する確認用SQL（1行返ってくれば成功）
-- SELECT * FROM incidents WHERE id = '06af46e0-be33-4169-8d46-3897c17f3dce' AND deleted_at IS NOT NULL;
