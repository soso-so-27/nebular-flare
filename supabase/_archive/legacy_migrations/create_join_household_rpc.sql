-- join_household_by_code RPC を作成
-- 招待コードを使って家族に参加する機能

-- まず既存の関数があれば削除
DROP FUNCTION IF EXISTS join_household_by_code(TEXT);

CREATE OR REPLACE FUNCTION join_household_by_code(invite_code TEXT)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_household_id UUID;
    v_user_id UUID;
    v_expires_at TIMESTAMPTZ;
    v_existing_member BOOLEAN;
BEGIN
    -- 現在のユーザーを取得
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Not authenticated');
    END IF;

    -- 招待コードから household_id を取得
    SELECT household_id, expires_at INTO v_household_id, v_expires_at
    FROM household_invites
    WHERE code = invite_code;

    IF v_household_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Invalid invite code');
    END IF;

    -- 有効期限をチェック
    IF v_expires_at IS NOT NULL AND v_expires_at < NOW() THEN
        RETURN jsonb_build_object('success', false, 'message', 'Invite code has expired');
    END IF;

    -- 既にメンバーかどうかチェック
    SELECT EXISTS(
        SELECT 1 FROM household_members
        WHERE household_id = v_household_id AND user_id = v_user_id
    ) INTO v_existing_member;

    IF v_existing_member THEN
        RETURN jsonb_build_object('success', true, 'message', 'Already a member');
    END IF;

    -- household_members に追加
    INSERT INTO household_members (household_id, user_id, role, joined_at)
    VALUES (v_household_id, v_user_id, 'member', NOW());

    -- users テーブルの household_id も更新
    UPDATE users
    SET household_id = v_household_id
    WHERE id = v_user_id;

    RETURN jsonb_build_object('success', true, 'message', 'Successfully joined household');

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$ LANGUAGE plpgsql;

-- 実行権限を付与
GRANT EXECUTE ON FUNCTION join_household_by_code(TEXT) TO authenticated;

-- スキーマキャッシュをリロード
NOTIFY pgrst, 'reload config';

SELECT 'Created join_household_by_code RPC' as status;
