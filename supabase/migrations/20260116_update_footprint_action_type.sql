-- 足あと交換（ポイント消費）のためのアクションタイプ追加
-- =====================================================

-- cat_footprints テーブルのアクションタイプ制約を更新
ALTER TABLE cat_footprints DROP CONSTRAINT IF EXISTS cat_footprints_action_type_check;

ALTER TABLE cat_footprints ADD CONSTRAINT cat_footprints_action_type_check 
    CHECK (action_type IN ('login', 'care', 'observation', 'photo', 'incident', 'exchange'));

-- ポイントが負（消費）の場合も許可するようにする
-- 元々正の制約はなかったのでそのままでOK
