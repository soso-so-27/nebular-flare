-- Check if columns exist
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'cats' 
AND column_name IN ('background_mode', 'background_media');
