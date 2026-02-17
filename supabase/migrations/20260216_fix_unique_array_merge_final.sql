-- migration: 20260216_fix_unique_array_merge_final.sql
-- Description: Fixes unique_array_merge naming/type mismatch and ensures array column types.

BEGIN;

-- 1. Ensure cat_ids columns are indeed arrays
-- cat_images
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'cat_images' AND column_name = 'cat_ids' AND data_type = 'uuid' -- NOT 'ARRAY'
    ) THEN
        ALTER TABLE public.cat_images ALTER COLUMN cat_ids TYPE uuid[] USING ARRAY[cat_ids];
    END IF;
END $$;

-- incidents
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'incidents' AND column_name = 'cat_ids' AND data_type = 'uuid' -- NOT 'ARRAY'
    ) THEN
        ALTER TABLE public.incidents ALTER COLUMN cat_ids TYPE uuid[] USING ARRAY[cat_ids];
    END IF;
END $$;

-- 2. Define the main function (underscore version)
CREATE OR REPLACE FUNCTION public.unique_array_merge(a uuid[], b uuid[])
RETURNS uuid[] AS $$
BEGIN
    RETURN ARRAY(
        SELECT DISTINCT unnest(COALESCE(a, '{}') || COALESCE(b, '{}'))
        WHERE unnest IS NOT NULL
    );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 3. Define the overload for (uuid, uuid) to prevent type mismatch errors
CREATE OR REPLACE FUNCTION public.unique_array_merge(a uuid, b uuid)
RETURNS uuid[] AS $$
BEGIN
    RETURN public.unique_array_merge(ARRAY[a], ARRAY[b]);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 4. Define the hyphenated version as an alias (just in case)
CREATE OR REPLACE FUNCTION public."unique-array-merge"(a uuid[], b uuid[])
RETURNS uuid[] AS $$
BEGIN
    RETURN public.unique_array_merge(a, b);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION public."unique-array-merge"(a uuid, b uuid)
RETURNS uuid[] AS $$
BEGIN
    RETURN public.unique_array_merge(a, b);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 5. Fix the sync trigger function one last time (using the most robust logic)
CREATE OR REPLACE FUNCTION public.sync_incident_photos_to_gallery()
RETURNS TRIGGER AS $$
DECLARE
    photo_path TEXT;
    ai_meta JSONB;
BEGIN
    -- Logical deletion handling
    IF (TG_OP = 'UPDATE' AND NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL) THEN
        UPDATE public.cat_images SET deleted_at = NEW.deleted_at WHERE storage_path = ANY(NEW.photos);
        RETURN NEW;
    END IF;

    -- Standard sync
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
