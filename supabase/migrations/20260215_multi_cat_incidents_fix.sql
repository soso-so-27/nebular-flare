-- migration: 20260215_multi_cat_incidents_fix.sql
-- Description: incidents テーブルに cat_ids カラムを追加し、重複投稿・重複通知を防止するための基盤を整えます。

BEGIN;

-- 1. cat_ids カラムの追加 (UUID配列)
ALTER TABLE public.incidents ADD COLUMN IF NOT EXISTS cat_ids uuid[] DEFAULT '{}';

-- 2. 既存データの移行: cat_id から cat_ids 配列へ
UPDATE public.incidents 
SET cat_ids = ARRAY[cat_id] 
WHERE (cat_ids IS NULL OR cardinality(cat_ids) = 0) AND cat_id IS NOT NULL;

-- 3. インデックスの作成
CREATE INDEX IF NOT EXISTS idx_incidents_cat_ids ON public.incidents USING GIN (cat_ids);

-- 4. 写真同期トリガー関数の更新 (複数猫対応)
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
        -- すでにある場合は更新（猫IDリストをマージ）、なければ挿入
        INSERT INTO public.cat_images (
            cat_id, 
            cat_ids, 
            storage_path, 
            memo, 
            created_at,
            ai_analysis
        ) VALUES (
            NEW.cat_id, -- 代表の猫ID
            NEW.cat_ids, -- 全ての猫ID
            photo_path, 
            NEW.note, 
            COALESCE(NEW.onset_at, NEW.created_at),
            ai_meta
        )
        ON CONFLICT (storage_path) DO UPDATE SET
            cat_ids = public.unique_array_merge(cat_images.cat_ids, EXCLUDED.cat_ids),
            ai_analysis = EXCLUDED.ai_analysis,
            memo = EXCLUDED.memo,
            updated_at = NOW();
    END LOOP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. 配列をマージして重複を除くヘルパー関数（もし未定義なら）
CREATE OR REPLACE FUNCTION public.unique_array_merge(a uuid[], b uuid[])
RETURNS uuid[] AS $$
BEGIN
    RETURN ARRAY(
        SELECT DISTINCT unnest(a || b)
    );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 6. 通知ロジックへの影響確認
-- 既存の push-notification エッジ関数は table='incidents' の record をそのまま受け取るため、
-- 本来は変更不要ですが、トリガー側で「一回の INSERT で一回の通知」が担保されるようになります。

COMMIT;
