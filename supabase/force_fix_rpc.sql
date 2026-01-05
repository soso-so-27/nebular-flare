-- 1. 念のため既存の関数を削除
DROP FUNCTION IF EXISTS fetch_family_members(UUID);

-- 2. 再作成 (ambiguity修正済み)
CREATE OR REPLACE FUNCTION fetch_family_members(p_household_id UUID)
RETURNS TABLE (
  user_id UUID,
  role TEXT,
  joined_at TIMESTAMPTZ,
  display_name TEXT,
  avatar_url TEXT,
  email TEXT
)
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
BEGIN
  -- 権限チェック: explicit alias (hm) used to avoid ambiguity
  IF NOT EXISTS (
    SELECT 1 FROM household_members hm
    WHERE hm.household_id = p_household_id AND hm.user_id = auth.uid()
  ) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    hm.user_id,
    hm.role::TEXT,
    hm.joined_at,
    COALESCE((u.raw_user_meta_data->>'full_name')::TEXT, u.email) as display_name,
    (u.raw_user_meta_data->>'avatar_url')::TEXT as avatar_url,
    u.email::TEXT
  FROM household_members hm
  JOIN auth.users u ON hm.user_id = u.id
  WHERE hm.household_id = p_household_id;
END;
$$ LANGUAGE plpgsql;

-- 3. 実行権限の付与
GRANT EXECUTE ON FUNCTION fetch_family_members(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION fetch_family_members(UUID) TO service_role;

-- 4. キャッシュリロード通知 (これが重要です)
NOTIFY pgrst, 'reload config';

SELECT 'Recreated RPC and requested schema reload' as status;
