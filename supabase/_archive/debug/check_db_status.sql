-- 1. Check if background columns exist in 'cats' table
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'cats' 
AND column_name IN ('background_mode', 'background_media');

-- 2. Check active RLS policies on 'cats' table
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'cats';
