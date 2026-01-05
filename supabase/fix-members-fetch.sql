-- 家族メンバー一覧取得の不具合（400エラー）を修正し、データの整合性を担保するスクリプト

-- 1. get_household_members 関数を完全に再作成
-- 既存の定義を削除
DROP FUNCTION IF EXISTS get_household_members(UUID);

-- 再定義 (SECURITY DEFINERで権限問題を回避)
CREATE OR REPLACE FUNCTION get_household_members(lookup_household_id UUID)
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
  -- 呼び出し元がその世帯のメンバーであることを確認
  IF NOT EXISTS (
    SELECT 1 FROM household_members
    WHERE household_id = lookup_household_id AND user_id = auth.uid()
  ) THEN
    RETURN; -- 権限がない場合は空を返す
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
  WHERE hm.household_id = lookup_household_id;
END;
$$ LANGUAGE plpgsql;

-- 2. 実行権限の付与
GRANT EXECUTE ON FUNCTION get_household_members(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_household_members(UUID) TO service_role;

-- 3. データ整合性の修復（念押しバックフィル）
-- household_id がないユーザーに世帯を作成
DO $$
DECLARE
    u RECORD;
    new_household_id UUID;
BEGIN
    -- 1. usersテーブルにいて、household_idがNULLのユーザーを救済
    FOR u IN SELECT id FROM public.users WHERE household_id IS NULL LOOP
        -- 世帯作成
        INSERT INTO public.households (name) VALUES ('My Family') RETURNING id INTO new_household_id;
        
        -- users更新
        UPDATE public.users SET household_id = new_household_id WHERE id = u.id;
        
        -- メンバー追加
        INSERT INTO public.household_members (household_id, user_id, role)
        VALUES (new_household_id, u.id, 'owner')
        ON CONFLICT DO NOTHING;
    END LOOP;

    -- 2. household_idはあるが、memberテーブルにいないユーザーを救済
    FOR u IN SELECT id, household_id FROM public.users WHERE household_id IS NOT NULL LOOP
        IF NOT EXISTS (SELECT 1 FROM public.household_members WHERE user_id = u.id AND household_id = u.household_id) THEN
            INSERT INTO public.household_members (household_id, user_id, role)
            VALUES (u.household_id, u.id, 'owner')
            ON CONFLICT DO NOTHING;
        END IF;
    END LOOP;
END $$;

SELECT 'Fixed get_household_members RPC and backfilled data' as status;
