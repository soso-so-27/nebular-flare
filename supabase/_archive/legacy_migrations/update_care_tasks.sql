-- Migration: Rename Care Tasks to 'Request' style (Onegai)

-- 1. Food
UPDATE care_task_defs 
SET title = 'ごはんほしい' 
WHERE id = 'care_food';

-- 2. Water
UPDATE care_task_defs 
SET title = 'お水かえて' 
WHERE id = 'care_water';

-- 3. Litter
UPDATE care_task_defs 
SET title = 'トイレそうじ' 
WHERE id = 'care_litter';

-- 4. Brush
UPDATE care_task_defs 
SET title = 'ブラッシングして' 
WHERE id = 'care_brush';

-- 5. Play
UPDATE care_task_defs 
SET title = '遊んで' 
WHERE id = 'care_play';

-- 6. Medicine
UPDATE care_task_defs 
SET title = 'お薬ちょうだい' 
WHERE id = 'care_medicine' OR id = 'care_meds';

-- 7. Clip (If exists)
UPDATE care_task_defs 
SET title = '爪きって' 
WHERE id = 'care_clip';

-- 8. Hospital (If exists)
UPDATE care_task_defs 
SET title = '病院いこう' 
WHERE id = 'care_hospital';
