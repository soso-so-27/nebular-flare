-- migration: 20260216_fix_final_constraints_and_sync.sql
BEGIN;

-- 1. 重複データのクリーンアップ（もしあれば最新のものだけ残す）
DELETE FROM public.cat_images a
USING public.cat_images b
WHERE a.id < b.id AND a.storage_path = b.storage_path;

-- 2. storage_path にユニーク制約を追加
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'cat_images_storage_path_key'
    ) THEN
        ALTER TABLE public.cat_images ADD CONSTRAINT cat_images_storage_path_key UNIQUE (storage_path);
    END IF;
END $$;

-- 3. 不足しているカラムの追加
ALTER TABLE public.cat_images ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT NOW();

-- 4. ユーティリティ関数の定義（uuid配列とuuid単体の両方に対応）
CREATE OR REPLACE FUNCTION public.unique_array_merge(a uuid[], b uuid[])
RETURNS uuid[] AS $$
BEGIN
    RETURN ARRAY(
        SELECT DISTINCT unnest(COALESCE(a, '{}') || COALESCE(b, '{}'))
        WHERE unnest IS NOT NULL
    );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION public.unique_array_merge(a uuid, b uuid)
RETURNS uuid[] AS $$
BEGIN
    RETURN public.unique_array_merge(ARRAY[a], ARRAY[b]);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ハイフン名のエイリアスも再定義
CREATE OR REPLACE FUNCTION public."unique-array-merge"(a uuid[], b uuid[]) RETURNS uuid[] AS 'SELECT public.unique_array_merge($1, $2)' LANGUAGE sql IMMUTABLE;
CREATE OR REPLACE FUNCTION public."unique-array-merge"(a uuid, b uuid) RETURNS uuid[] AS 'SELECT public.unique_array_merge($1, $2)' LANGUAGE sql IMMUTABLE;

-- 5. 同期トリガー関数の最終版
CREATE OR REPLACE FUNCTION public.sync_incident_photos_to_gallery()
RETURNS TRIGGER AS $$
DECLARE
    photo_path TEXT;
    ai_meta JSONB;
BEGIN
    -- 削除同期
    IF (TG_OP = 'UPDATE' AND NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL) THEN
        UPDATE public.cat_images SET deleted_at = NEW.deleted_at WHERE storage_path = ANY(NEW.photos);
        RETURN NEW;
    END IF;

    -- 写真がない場合はスキップ
    IF NEW.photos IS NULL OR array_length(NEW.photos, 1) IS NULL THEN
        RETURN NEW;
    END IF;

    ai_meta := NEW.symptom_details->'ai_analysis';

    FOREACH photo_path IN ARRAY NEW.photos LOOP
        INSERT INTO public.cat_images (
            cat_id, cat_ids, storage_path, memo, created_at, ai_analysis, source
        ) VALUES (
            NEW.cat_id, 
            COALESCE(NEW.cat_ids, ARRAY[NEW.cat_id]), 
            photo_path, 
            NEW.note, 
            COALESCE(NEW.onset_at, NEW.created_at),
            ai_meta,
            'incident'
        )
        ON CONFLICT (storage_path) DO UPDATE SET
            cat_ids = public.unique_array_merge(cat_images.cat_ids, EXCLUDED.cat_ids),
            ai_analysis = COALESCE(EXCLUDED.ai_analysis, cat_images.ai_analysis),
            memo = EXCLUDED.memo,
            deleted_at = NULL,
            updated_at = NOW();
    END LOOP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;
