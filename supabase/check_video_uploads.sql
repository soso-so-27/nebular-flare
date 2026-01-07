-- 1. Check for Video Files in Storage (avatars bucket)
SELECT 
    name, 
    id, 
    metadata, 
    created_at,
    updated_at
FROM storage.objects 
WHERE bucket_id = 'avatars' 
AND (LOWER(name) LIKE '%.mp4' OR LOWER(name) LIKE '%.webm' OR LOWER(name) LIKE '%.mov')
ORDER BY created_at DESC;

-- 2. Check if Cats table is referencing these videos
-- (Fixed: changed updated_at to created_at)
SELECT 
    id, 
    name, 
    background_mode, 
    background_media,
    created_at
FROM cats 
WHERE background_media IS NOT NULL
ORDER BY created_at DESC;
