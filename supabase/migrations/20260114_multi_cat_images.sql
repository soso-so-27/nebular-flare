-- Migration: Add Multi-Cat Support to cat_images
-- This allows one photo to be tagged with multiple cats.

BEGIN;

-- 1. Add cat_ids column (UUID array)
ALTER TABLE public.cat_images ADD COLUMN IF NOT EXISTS cat_ids uuid[] DEFAULT '{}';

-- 2. Migrate existing data: Move cat_id to cat_ids array if empty
UPDATE public.cat_images 
SET cat_ids = ARRAY[cat_id] 
WHERE (cat_ids IS NULL OR cardinality(cat_ids) = 0) AND cat_id IS NOT NULL;

-- 3. Create GIN index for efficient array searches
CREATE INDEX IF NOT EXISTS idx_cat_images_cat_ids ON public.cat_images USING GIN (cat_ids);

-- 4. Update RLS Policies for cat_images
-- Note: We check if ANY cat_id in the array belongs to the user's household.
DROP POLICY IF EXISTS "Authenticated users can select cat images" ON public.cat_images;
CREATE POLICY "Authenticated users can select cat images" ON public.cat_images
FOR SELECT TO authenticated
USING (
  cat_id IN (
    SELECT cats.id FROM cats 
    WHERE cats.household_id = (SELECT users.household_id FROM users WHERE users.id = auth.uid())
  ) OR
  EXISTS (
    SELECT 1 FROM cats 
    WHERE cats.id = ANY(cat_ids) 
    AND cats.household_id = (SELECT users.household_id FROM users WHERE users.id = auth.uid())
  )
);

-- 5. Update get_unified_gallery RPC
-- 2. ギャラリー取得関数の更新（名前の表示を修正）
-- 一度削除しないと戻り値の型変更ができないため DROP を追加
DROP FUNCTION IF EXISTS public.get_unified_gallery(uuid, uuid, text, integer, integer);
DROP FUNCTION IF EXISTS public.get_unified_gallery(uuid, text, text[]);
DROP FUNCTION IF EXISTS public.get_unified_gallery(uuid, uuid);

CREATE OR REPLACE FUNCTION public.get_unified_gallery(
  target_household_id uuid,
  filter_cat_id uuid DEFAULT NULL,
  filter_tag text DEFAULT NULL,
  limit_count integer DEFAULT 50,
  offset_count integer DEFAULT 0
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
  tags jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH unified AS (
    -- 1. アルバム画像 (cat_images)
    SELECT 
      ci.id::text, 
      ci.cat_id, 
      c.name as cat_name,
      ci.cat_ids,
      ci.storage_path as url, 
      'profile'::text as source,
      null::text as type,
      ci.created_at, 
      ci.is_favorite, 
      false as is_url,
      ci.memo, 
      ci.tags
    FROM cat_images ci
    LEFT JOIN cats c ON c.id = ci.cat_id
    WHERE c.household_id = target_household_id
      AND (filter_cat_id IS NULL OR ci.cat_id = filter_cat_id OR filter_cat_id = ANY(ci.cat_ids))
      AND (
        filter_tag IS NULL OR 
        EXISTS (SELECT 1 FROM jsonb_array_elements(ci.tags) AS t WHERE t->>'name' = filter_tag)
      )

    UNION ALL

    -- 2. お世話ログ (care_logs) - done_at / notes (複数) を使用
    SELECT 
      (cl.id || '_' || u.url)::text as id, 
      cl.cat_id, 
      c.name as cat_name,
      ARRAY[cl.cat_id] as cat_ids,
      u.url as url, 
      'care'::text as source,
      cl.type::text as type,
      cl.done_at as created_at, 
      false as is_favorite, 
      true as is_url,
      cl.notes as memo, 
      '[]'::jsonb as tags
    FROM care_logs cl
    LEFT JOIN cats c ON c.id = cl.cat_id
    CROSS JOIN LATERAL unnest(cl.images) u(url)
    WHERE c.household_id = target_household_id
      AND cl.deleted_at IS NULL
      AND (filter_cat_id IS NULL OR cl.cat_id = filter_cat_id)
      AND filter_tag IS NULL

    UNION ALL

    -- 3. 記録 (observations) - recorded_at / notes (複数) を使用
    SELECT 
      (obs.id || '_' || u.url)::text as id, 
      obs.cat_id, 
      c.name as cat_name,
      ARRAY[obs.cat_id] as cat_ids,
      u.url as url, 
      'observation'::text as source,
      obs.type::text as type,
      obs.recorded_at as created_at, 
      false as is_favorite, 
      true as is_url,
      obs.notes as memo, 
      '[]'::jsonb as tags
    FROM observations obs
    LEFT JOIN cats c ON c.id = obs.cat_id
    CROSS JOIN LATERAL unnest(obs.images) u(url)
    WHERE c.household_id = target_household_id
      AND obs.deleted_at IS NULL
      AND (filter_cat_id IS NULL OR obs.cat_id = filter_cat_id)
      AND filter_tag IS NULL
  )
  SELECT * FROM unified
  ORDER BY created_at DESC
  LIMIT limit_count
  OFFSET offset_count;
END;
$$;

COMMIT;
