-- 最新の1件のインシデント（タイムラインの記録）を確認するSQL
-- 写真が登録されているか、アバターと重複していないかをチェックします

SELECT 
    i.id,
    c.name as cat_name,
    i.type,
    i.note,
    i.photos as registered_photos,
    c.avatar as cat_avatar,
    -- 登録されている写真の数
    cardinality(i.photos) as photo_count,
    -- アバターと重複している写真の手動チェック用
    i.created_at
FROM 
    incidents i
JOIN 
    cats c ON i.cat_id = c.id
WHERE 
    i.deleted_at IS NULL
ORDER BY 
    i.created_at DESC
LIMIT 1;
