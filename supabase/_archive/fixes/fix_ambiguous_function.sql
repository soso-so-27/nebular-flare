-- 1. 古いバージョンの関数を完全に削除します
-- 引数の構成が違うものが複数存在すると、どちらを呼ぶか迷ってエラー（Ambiguous Function）になるためです
DROP FUNCTION IF EXISTS get_unified_gallery(uuid, uuid, int, int);
DROP FUNCTION IF EXISTS get_unified_gallery(uuid, uuid, text, int, int);

-- 2. 最新の関数（タグ対応版）を作成します
CREATE OR REPLACE FUNCTION get_unified_gallery(
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
    url text,
    source text,
    type text,
    created_at timestamptz,
    is_favorite boolean,
    is_url boolean,
    memo text,
    tags jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    WITH unified AS (
        -- 1. 投稿写真
        SELECT
            img.id::text as id,
            img.cat_id,
            c.name as cat_name,
            img.storage_path as url,
            'profile'::text as source,
            null::text as type,
            img.created_at,
            img.is_favorite,
            false as is_url,
            img.memo,
            img.tags
        FROM cat_images img
        JOIN cats c ON img.cat_id = c.id
        WHERE c.household_id = target_household_id
        AND c.deleted_at IS NULL
        
        UNION ALL
        
        -- 2. お世話記録の写真
        SELECT
            (cl.id || '_' || u.url)::text as id,
            cl.cat_id,
            c.name as cat_name,
            u.url as url,
            'care'::text as source,
            cl.type as type,
            cl.done_at as created_at,
            false as is_favorite,
            true as is_url,
            null::text as memo,
            '[]'::jsonb as tags
        FROM care_logs cl
        JOIN cats c ON cl.cat_id = c.id
        CROSS JOIN LATERAL unnest(cl.images) u(url)
        WHERE c.household_id = target_household_id
        AND c.deleted_at IS NULL
        AND cl.deleted_at IS NULL
        
        UNION ALL
        
        -- 3. 気づき記録の写真
        SELECT
            (o.id || '_' || u.url)::text as id,
            o.cat_id,
            c.name as cat_name,
            u.url as url,
            'observation'::text as source,
            o.type as type,
            o.recorded_at as created_at,
            false as is_favorite,
            true as is_url,
            null::text as memo,
            '[]'::jsonb as tags
        FROM observations o
        JOIN cats c ON o.cat_id = c.id
        CROSS JOIN LATERAL unnest(o.images) u(url)
        WHERE c.household_id = target_household_id
        AND c.deleted_at IS NULL
        AND o.deleted_at IS NULL
    )
    SELECT * FROM unified
    WHERE (filter_cat_id IS NULL OR unified.cat_id = filter_cat_id)
    AND (filter_tag IS NULL OR unified.tags @> jsonb_build_array(jsonb_build_object('name', filter_tag)))
    ORDER BY created_at DESC
    LIMIT limit_count
    OFFSET offset_count;
END;
$$;
