-- join_household_by_code RPC を更新
-- 「既に別の世帯に参加している場合は確認を求める」機能を追加

DROP FUNCTION IF EXISTS join_household_by_code(TEXT);
DROP FUNCTION IF EXISTS join_household_by_code(TEXT, BOOLEAN);

CREATE OR REPLACE FUNCTION join_household_by_code(
    invite_code TEXT,
    force_join BOOLEAN DEFAULT FALSE
)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_target_household_id UUID;
    v_user_id UUID;
    v_expires_at TIMESTAMPTZ;
    v_existing_household_id UUID;
    v_existing_household_name TEXT;
    v_target_household_name TEXT;
    v_existing_member BOOLEAN;
BEGIN
    -- 現在のユーザーを取得
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Not authenticated');
    END IF;

    -- 招待コードから household_id を取得
    SELECT household_id, expires_at INTO v_target_household_id, v_expires_at
    FROM household_invites
    WHERE code = invite_code;

    IF v_target_household_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Invalid invite code');
    END IF;

    -- 有効期限をチェック
    IF v_expires_at IS NOT NULL AND v_expires_at < NOW() THEN
        RETURN jsonb_build_object('success', false, 'message', 'Invite code has expired');
    END IF;

    -- 対象の世帯名を取得
    SELECT name INTO v_target_household_name FROM households WHERE id = v_target_household_id;

    -- 既にこの世帯のメンバーかどうかチェック
    SELECT EXISTS(
        SELECT 1 FROM household_members
        WHERE household_id = v_target_household_id AND user_id = v_user_id
    ) INTO v_existing_member;

    IF v_existing_member THEN
        RETURN jsonb_build_object('success', true, 'message', 'Already a member');
    END IF;

    -- 現在のユーザーが別の世帯に所属しているかチェック
    SELECT household_id INTO v_existing_household_id FROM users WHERE id = v_user_id;
    
    IF v_existing_household_id IS NOT NULL AND v_existing_household_id != v_target_household_id THEN
        -- 既存の世帯名を取得
        SELECT name INTO v_existing_household_name FROM households WHERE id = v_existing_household_id;
        
        -- force_join が false なら確認を求める
        IF NOT force_join THEN
            RETURN jsonb_build_object(
                'success', false,
                'needs_confirmation', true,
                'message', '既に別の家族に参加しています。移動しますか？',
                'current_household_name', v_existing_household_name,
                'target_household_name', v_target_household_name
            );
        END IF;
        
        -- 古い世帯から退出（household_members から削除）
        DELETE FROM household_members WHERE user_id = v_user_id AND household_id = v_existing_household_id;
    END IF;

    -- household_members に追加
    INSERT INTO household_members (household_id, user_id, role, joined_at)
    VALUES (v_target_household_id, v_user_id, 'member', NOW())
    ON CONFLICT (household_id, user_id) DO NOTHING;

    -- users テーブルの household_id も更新
    UPDATE users
    SET household_id = v_target_household_id
    WHERE id = v_user_id;

    RETURN jsonb_build_object(
        'success', true, 
        'message', 'Successfully joined household',
        'household_name', v_target_household_name
    );

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$ LANGUAGE plpgsql;

-- 実行権限を付与
GRANT EXECUTE ON FUNCTION join_household_by_code(TEXT, BOOLEAN) TO authenticated;

-- スキーマキャッシュをリロード
NOTIFY pgrst, 'reload config';

SELECT 'Updated join_household_by_code RPC with confirmation flow' as status;
