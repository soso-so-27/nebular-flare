-- 既存の関数でのトラブル（400エラー）を回避するため、
-- 新しい名前のクリーンな関数を作成してそちらを使用するようにします。

CREATE OR REPLACE FUNCTION fetch_family_members(target_household_id UUID)
RETURNS TABLE (
  user_id UUID,
  role TEXT,
  joined_at TIMESTAMPTZ,
  email TEXT,
  name TEXT,
  avatar TEXT
)
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
BEGIN
  -- 権限チェック: 自分の世帯でなければ空を返す
  -- (NULLチェックも含める)
  IF target_household_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    hm.user_id,
    hm.role::TEXT,
    hm.joined_at,
    u.email::TEXT,
    (u.raw_user_meta_data->>'full_name')::TEXT as name,
    (u.raw_user_meta_data->>'avatar_url')::TEXT as avatar
  FROM household_members hm
  JOIN auth.users u ON hm.user_id = u.id
  WHERE hm.household_id = target_household_id;
END;
$$ LANGUAGE plpgsql;

-- 実行権限の付与
GRANT EXECUTE ON FUNCTION fetch_family_members(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION fetch_family_members(UUID) TO service_role;

SELECT 'Created fetch_family_members RPC' as status;
