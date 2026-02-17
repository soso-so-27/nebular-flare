-- Phase 26: 削除同期機能の追加
-- 1. cat_images テーブルに削除日時カラムを追加
ALTER TABLE public.cat_images ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- 2. 統合ギャラリー関数を更新（削除済みデータを除外）
CREATE OR REPLACE FUNCTION public.get_unified_gallery(
    target_household_id uuid,
    filter_cat_id uuid DEFAULT NULL,
    filter_tag text DEFAULT NULL,
    limit_count int DEFAULT 50,
    offset_count int DEFAULT 0
)
RETURNS TABLE (
    id text,
    cat_id uuid,
    cat_name text,
    cat_ids uuid[],
    url text,
    source text,
    type text,
    created_at timestamptz,
    is_favorite boolean,
    is_url boolean,
    memo text,
    tags jsonb,
    ai_analysis jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    WITH unified AS (
        -- 1. Profile Images (cat_images)
        SELECT
            img.id::text as id,
            img.cat_id,
            c.name as cat_name,
            img.cat_ids,
            img.storage_path as url,
            COALESCE(img.source, 'profile')::text as source,
            null::text as type,
            img.created_at,
            img.is_favorite,
            false as is_url,
            img.memo,
            img.tags,
            img.ai_analysis
        FROM public.cat_images img
        JOIN public.cats c ON img.cat_id = c.id
        WHERE c.household_id = target_household_id
        AND c.deleted_at IS NULL
        AND img.deleted_at IS NULL -- 追加: 削除済みを除外
        
        UNION ALL
        
        -- 2. Care Log Images
        SELECT
            (cl.id || '_' || u.url)::text as id,
            cl.cat_id,
            c.name as cat_name,
            ARRAY[cl.cat_id] as cat_ids,
            u.url as url,
            'care'::text as source,
            cl.type as type,
            cl.done_at as created_at,
            false as is_favorite,
            true as is_url,
            null::text as memo,
            '[]'::jsonb as tags,
            null::jsonb as ai_analysis
        FROM public.care_logs cl
        JOIN public.cats c ON cl.cat_id = c.id
        CROSS JOIN LATERAL unnest(cl.images) u(url)
        WHERE c.household_id = target_household_id
        AND c.deleted_at IS NULL
        AND cl.deleted_at IS NULL
        
        UNION ALL
        
        -- 3. Observation Images
        SELECT
            (o.id || '_' || u.url)::text as id,
            o.cat_id,
            c.name as cat_name,
            ARRAY[o.cat_id] as cat_ids,
            u.url as url,
            'observation'::text as source,
            o.type as type,
            o.recorded_at as created_at,
            false as is_favorite,
            true as is_url,
            null::text as memo,
            '[]'::jsonb as tags,
            null::jsonb as ai_analysis
        FROM public.observations o
        JOIN public.cats c ON o.cat_id = c.id
        CROSS JOIN LATERAL unnest(o.images) u(url)
        WHERE c.household_id = target_household_id
        AND c.deleted_at IS NULL
        AND o.deleted_at IS NULL
    )
    SELECT * FROM unified
    WHERE (filter_cat_id IS NULL OR (unified.cat_ids @> ARRAY[filter_cat_id]))
    AND (
        filter_tag IS NULL 
        OR 
        EXISTS (
            SELECT 1 FROM jsonb_array_elements(unified.tags) AS t 
            WHERE t->>'name' = filter_tag
        )
    )
    ORDER BY created_at DESC
    LIMIT limit_count
    OFFSET offset_count;
END;
$$;

-- 3. 同期トリガー関数を強化（削除・更新に対応）
CREATE OR REPLACE FUNCTION public.sync_incident_photos_to_gallery()
RETURNS TRIGGER AS $$
DECLARE
    photo_path TEXT;
    ai_meta JSONB;
BEGIN
    -- A. 論理削除の同期
    IF (TG_OP = 'UPDATE' AND NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL) THEN
        UPDATE public.cat_images 
        SET deleted_at = NEW.deleted_at 
        WHERE storage_path = ANY(NEW.photos);
        RETURN NEW;
    END IF;

    -- B. 論理復元の同期
    IF (TG_OP = 'UPDATE' AND NEW.deleted_at IS NULL AND OLD.deleted_at IS NOT NULL) THEN
        UPDATE public.cat_images 
        SET deleted_at = NULL 
        WHERE storage_path = ANY(NEW.photos);
        RETURN NEW;
    END IF;

    -- C. 写真配列から削除された個別写真の同期
    IF (TG_OP = 'UPDATE' AND OLD.photos IS NOT NULL) THEN
        UPDATE public.cat_images 
        SET deleted_at = NOW()
        WHERE storage_path = ANY(
            ARRAY(
                SELECT unnest(OLD.photos)
                EXCEPT
                SELECT unnest(COALESCE(NEW.photos, '{}'))
            )
        );
    END IF;

    -- D. 新規追加・更新時の同期
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
            ai_analysis = COALESCE(cat_images.ai_analysis, EXCLUDED.ai_analysis),
            memo = EXCLUDED.memo,
            deleted_at = NULL,
            updated_at = NOW();
    END LOOP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- トリガーの再登録
DROP TRIGGER IF EXISTS tr_sync_incident_photos ON public.incidents;
CREATE TRIGGER tr_sync_incident_photos
AFTER INSERT OR UPDATE ON public.incidents
FOR EACH ROW
EXECUTE FUNCTION public.sync_incident_photos_to_gallery();

-- 4. 既存の削除済みデータの反映（バックフィル）
UPDATE public.cat_images ci
SET deleted_at = i.deleted_at
FROM public.incidents i
WHERE i.photos @> ARRAY[ci.storage_path]
AND i.deleted_at IS NOT NULL;
