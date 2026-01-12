-- Final corrected get_cats_with_details RPC
DROP FUNCTION IF EXISTS get_cats_with_details(uuid);

CREATE OR REPLACE FUNCTION get_cats_with_details(target_household_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result json;
BEGIN
    SELECT json_agg(cat_row) INTO result
    FROM (
        SELECT 
            c.id,
            c.name,
            c.avatar,
            c.sex,
            c.birthday,
            COALESCE(c.weight, 0) as weight,
            c.microchip_id,
            c.notes,
            c.background_mode,
            c.background_media,
            c.created_at,
            (
                SELECT json_agg(img_row)
                FROM (
                    SELECT 
                        id, 
                        storage_path, 
                        created_at, 
                        is_favorite
                    FROM cat_images 
                    WHERE cat_id = c.id
                    ORDER BY created_at DESC
                ) img_row
            ) as images,
            (
                SELECT json_agg(weight_row)
                FROM (
                    SELECT 
                        id, 
                        weight, 
                        recorded_at, 
                        notes
                    FROM cat_weight_history
                    WHERE cat_id = c.id
                    ORDER BY recorded_at DESC
                ) weight_row
            ) as weight_history
        FROM cats c
        WHERE c.household_id = target_household_id
        AND c.deleted_at IS NULL
        ORDER BY c.created_at ASC
    ) cat_row;

    RETURN COALESCE(result, '[]'::json);
END;
$$;
