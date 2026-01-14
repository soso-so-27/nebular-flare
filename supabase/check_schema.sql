-- Check cat_images definition
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'cat_images';
