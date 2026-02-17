-- 根本解決: 「できごと」と「図鑑」の自動連携トリガー
-- これにより、チャットやできごとから写真を上げると自動的に図鑑にも追加されるようになります。

-- 1. 同期用関数の作成
CREATE OR REPLACE FUNCTION public.sync_incident_photos_to_gallery()
RETURNS TRIGGER AS $$
DECLARE
    photo_path TEXT;
BEGIN
    -- photos配列がNULLまたは空の場合は何もしない
    IF NEW.photos IS NULL OR array_length(NEW.photos, 1) IS NULL THEN
        RETURN NEW;
    END IF;

    -- 配列内の各写真パスについてループ
    FOREACH photo_path IN ARRAY NEW.photos LOOP
        -- すでに図鑑に同じパスがあればスキップ（重複防止）
        IF NOT EXISTS (SELECT 1 FROM public.cat_images WHERE storage_path = photo_path) THEN
            INSERT INTO public.cat_images (
                cat_id, 
                cat_ids, 
                storage_path, 
                memo, 
                created_at
            ) VALUES (
                NEW.cat_id, 
                ARRAY[NEW.cat_id], 
                photo_path, 
                NEW.note, 
                COALESCE(NEW.onset_at, NEW.created_at)
            );
        END IF;
    END LOOP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. トリガーの作成（新規作成時のみ実行）
DROP TRIGGER IF EXISTS tr_sync_incident_photos ON public.incidents;
CREATE TRIGGER tr_sync_incident_photos
AFTER INSERT ON public.incidents
FOR EACH ROW
EXECUTE FUNCTION public.sync_incident_photos_to_gallery();

-- 3. 既存のデータの不整合も一括で解消（もし漏れがあればここで修正）
INSERT INTO public.cat_images (cat_id, cat_ids, storage_path, memo, created_at)
SELECT 
    i.cat_id, 
    ARRAY[i.cat_id], 
    p, 
    i.note, 
    COALESCE(i.onset_at, i.created_at)
FROM 
    public.incidents i,
    unnest(i.photos) p
WHERE 
    p IS NOT NULL 
    AND NOT EXISTS (
        SELECT 1 FROM public.cat_images ci WHERE ci.storage_path = p
    );
