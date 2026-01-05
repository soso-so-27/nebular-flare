-- join_household_by_code関数の修正スクリプト
-- user_profilesテーブル（存在しない）ではなく、usersテーブルを参照するように修正します

CREATE OR REPLACE FUNCTION join_household_by_code(invite_code TEXT)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_household_id UUID;
  current_user_id UUID;
BEGIN
  current_user_id := auth.uid();

  -- 招待コードからhousehold_idを取得
  SELECT household_id INTO target_household_id
  FROM household_invites
  WHERE code = invite_code
  AND expires_at > NOW();

  IF target_household_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Invalid or expired code');
  END IF;

  -- 既にメンバーかチェック
  IF EXISTS (SELECT 1 FROM household_members WHERE household_id = target_household_id AND user_id = current_user_id) THEN
    -- 既にメンバーなら成功扱いにする（リダイレクト用）
    RETURN jsonb_build_object('success', true, 'message', 'Already a member', 'household_id', target_household_id);
  END IF;

  -- メンバーとして追加
  INSERT INTO household_members (household_id, user_id, role)
  VALUES (target_household_id, current_user_id, 'member');

  -- usersテーブルのデフォルトhousehold_idを更新 (user_profilesではなくusers)
  UPDATE users
  SET household_id = target_household_id
  WHERE id = current_user_id AND household_id IS NULL;

  RETURN jsonb_build_object('success', true, 'household_id', target_household_id);
END;
$$ LANGUAGE plpgsql;

SELECT 'Fixed join_household_by_code function' as status;
