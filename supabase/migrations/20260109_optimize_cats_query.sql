-- =============================================================================
-- N+1 クエリ最適化: get_cats_with_details RPC
-- =============================================================================
-- 現状: useCats フックが3回のDBクエリを実行
--   1. get_all_cats RPC
--   2. cat_images テーブル
--   3. cat_weight_history テーブル
--
-- 改善: 1回のRPC呼び出しで全データを取得
--
-- Supabase Dashboard > SQL Editor で実行してください
-- =============================================================================

-- 既存の関数を削除（存在する場合）
DROP FUNCTION IF EXISTS get_cats_with_details(uuid);

-- 新しい最適化されたRPC関数を作成
CREATE OR REPLACE FUNCTION get_cats_with_details(target_household_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    result json;
BEGIN
    SELECT json_agg(cat_data)
    INTO result
    FROM (
        SELECT 
            c.id,
            c.name,
            c.avatar,
            c.birth_date,
            c.household_id,
            c.created_at,
            c.updated_at,
            c.bg_mode,
            c.bg_media,
            c.bg_color,
            -- Images as JSON array
            COALESCE(
                (SELECT json_agg(json_build_object(
                    'id', ci.id,
                    'storage_path', ci.storage_path,
                    'cat_id', ci.cat_id,
                    'created_at', ci.created_at,
                    'is_favorite', ci.is_favorite,
                    'memo', ci.memo
                ) ORDER BY ci.created_at DESC)
                FROM cat_images ci
                WHERE ci.cat_id = c.id),
                '[]'::json
            ) AS images,
            -- Weight history as JSON array (latest 10)
            COALESCE(
                (SELECT json_agg(json_build_object(
                    'id', cwh.id,
                    'cat_id', cwh.cat_id,
                    'weight', cwh.weight,
                    'recorded_at', cwh.recorded_at,
                    'notes', cwh.notes
                ) ORDER BY cwh.recorded_at DESC)
                FROM (
                    SELECT * FROM cat_weight_history sub_cwh
                    WHERE sub_cwh.cat_id = c.id
                    ORDER BY sub_cwh.recorded_at DESC
                    LIMIT 10
                ) cwh),
                '[]'::json
            ) AS weight_history
        FROM cats c
        WHERE c.household_id = target_household_id
        ORDER BY c.created_at ASC
    ) cat_data;

    -- Return empty array if no cats found
    RETURN COALESCE(result, '[]'::json);
END;
$$;

-- 関数に対するアクセス権を設定
GRANT EXECUTE ON FUNCTION get_cats_with_details(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_cats_with_details(uuid) TO anon;

-- =============================================================================
-- 確認クエリ（オプション）
-- =============================================================================
-- SELECT get_cats_with_details('your-household-id-here'::uuid);
