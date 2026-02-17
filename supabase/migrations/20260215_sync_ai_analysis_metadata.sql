-- migration: 20260215_sync_ai_analysis_metadata.sql
-- Description: AI解析メタデータ（棚、理由、確信度）を incidents から cat_images へ同期するためのトリガー更新

-- 1. 同期用関数の更新
CREATE OR REPLACE FUNCTION public.sync_incident_photos_to_gallery()
RETURNS TRIGGER AS $$
DECLARE
    photo_path TEXT;
    ai_meta JSONB;
BEGIN
    -- photos配列がNULLまたは空の場合は何もしない
    IF NEW.photos IS NULL OR array_length(NEW.photos, 1) IS NULL THEN
        RETURN NEW;
    END IF;

    -- symptom_details から ai_analysis を抽出
    ai_meta := NEW.symptom_details->'ai_analysis';

    -- 配列内の各写真パスについてループ
    FOREACH photo_path IN ARRAY NEW.photos LOOP
        -- すでにある場合は更新、なければ挿入
        INSERT INTO public.cat_images (
            cat_id, 
            cat_ids, 
            storage_path, 
            memo, 
            created_at,
            ai_analysis
        ) VALUES (
            NEW.cat_id, 
            ARRAY[NEW.cat_id], 
            photo_path, 
            NEW.note, 
            COALESCE(NEW.onset_at, NEW.created_at),
            ai_meta
        )
        ON CONFLICT (storage_path) DO UPDATE SET
            ai_analysis = EXCLUDED.ai_analysis,
            memo = EXCLUDED.memo,
            cat_id = EXCLUDED.cat_id,
            cat_ids = EXCLUDED.cat_ids;
    END LOOP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. 既存のデータの不整合も一括で解消（symptom_details に AI 解析があるものを gallery へ反映）
UPDATE public.cat_images ci
SET 
    ai_analysis = i.symptom_details->'ai_analysis',
    memo = i.note
FROM public.incidents i
WHERE i.photos @> ARRAY[ci.storage_path]
AND i.symptom_details->'ai_analysis' IS NOT NULL;
