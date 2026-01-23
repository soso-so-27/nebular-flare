-- 既存の get_household_members と機能は同じだが、引数名と戻り値のカラム名をクライアントコードに合わせて調整

DROP FUNCTION IF EXISTS fetch_family_members(UUID);

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
  -- 権限チェック: 実行ユーザーがその世帯のメンバーであることを確認
  IF NOT EXISTS (
    SELECT 1 FROM household_members hm
    WHERE hm.household_id = p_household_id AND hm.user_id = auth.uid()
  ) THEN
    RETURN; -- 権限がない場合は空を返す
  END IF;

  RETURN QUERY
  SELECT
    hm.user_id,
    hm.role::TEXT,
    hm.joined_at,
    COALESCE((u.raw_user_meta_data->>'full_name')::TEXT, u.email) as display_name, -- 名前がなければメールを表示
    (u.raw_user_meta_data->>'avatar_url')::TEXT as avatar_url,
    u.email::TEXT
  FROM household_members hm
  JOIN auth.users u ON hm.user_id = u.id
  WHERE hm.household_id = p_household_id;
END;
$$ LANGUAGE plpgsql;

-- 実行権限の付与
GRANT EXECUTE ON FUNCTION fetch_family_members(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION fetch_family_members(UUID) TO service_role;

SELECT 'Created fetch_family_members RPC' as status;
