-- Migration: Create unified gallery RPC with pagination
-- Created: 2026-01-12

CREATE OR REPLACE FUNCTION get_unified_gallery(
    target_household_id uuid,
    filter_cat_id uuid DEFAULT NULL,
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
    is_url boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    WITH unified AS (
        -- 1. Profile Images
        SELECT
            img.id::text as id,
            img.cat_id,
            c.name as cat_name,
            img.storage_path as url,
            'profile'::text as source,
            null::text as type,
            img.created_at,
            img.is_favorite,
            false as is_url
        FROM cat_images img
        JOIN cats c ON img.cat_id = c.id
        WHERE c.household_id = target_household_id
        AND c.deleted_at IS NULL
        
        UNION ALL
        
        -- 2. Care Log Images (Unnested)
        SELECT
            (cl.id || '_' || u.url)::text as id,
            cl.cat_id,
            c.name as cat_name,
            u.url as url,
            'care'::text as source,
            cl.type as type,
            cl.done_at as created_at,
            false as is_favorite,
            true as is_url
        FROM care_logs cl
        JOIN cats c ON cl.cat_id = c.id
        CROSS JOIN LATERAL unnest(cl.images) u(url)
        WHERE c.household_id = target_household_id
        AND c.deleted_at IS NULL
        AND cl.deleted_at IS NULL
        
        UNION ALL
        
        -- 3. Observation Images (Unnested)
        SELECT
            (o.id || '_' || u.url)::text as id,
            o.cat_id,
            c.name as cat_name,
            u.url as url,
            'observation'::text as source,
            o.type as type,
            o.recorded_at as created_at,
            false as is_favorite,
            true as is_url
        FROM observations o
        JOIN cats c ON o.cat_id = c.id
        CROSS JOIN LATERAL unnest(o.images) u(url)
        WHERE c.household_id = target_household_id
        AND c.deleted_at IS NULL
        AND o.deleted_at IS NULL
    )
    SELECT * FROM unified
    WHERE (filter_cat_id IS NULL OR unified.cat_id = filter_cat_id)
    ORDER BY created_at DESC
    LIMIT limit_count
    OFFSET offset_count;
END;
$$;
