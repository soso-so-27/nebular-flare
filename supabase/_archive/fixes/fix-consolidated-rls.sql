-- =====================================================
-- CatUp 統合RLS修正スクリプト
-- Supabase SQL Editorで実行してください
-- 作成日: 2026-01-03
-- =====================================================

-- =====================================================
-- STEP 1: household_members テーブルのデータ修復
-- (users テーブルにhousehold_idがあるが、household_membersに未登録のユーザーを追加)
-- =====================================================

INSERT INTO household_members (household_id, user_id, role)
SELECT u.household_id, u.id, 'owner'
FROM users u
WHERE u.household_id IS NOT NULL
AND NOT EXISTS (
    SELECT 1 FROM household_members hm 
    WHERE hm.user_id = u.id AND hm.household_id = u.household_id
)
ON CONFLICT DO NOTHING;

-- =====================================================
-- STEP 2: observations テーブルに household_id カラムを追加（まだない場合）
-- そしてデータを同期
-- =====================================================

-- カラム追加（既にあればスキップ）
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'observations' AND column_name = 'household_id'
    ) THEN
        ALTER TABLE observations ADD COLUMN household_id UUID REFERENCES households(id);
    END IF;
END $$;

-- 既存レコードのhousehold_idをcatsテーブルから同期
UPDATE observations o
SET household_id = c.household_id
FROM cats c
WHERE o.cat_id = c.id
AND o.household_id IS NULL;

-- =====================================================
-- STEP 3: observations テーブルのRLSポリシー修正
-- =====================================================

ALTER TABLE observations ENABLE ROW LEVEL SECURITY;

-- 既存ポリシー削除
DROP POLICY IF EXISTS "Users can access cat observations" ON observations;
DROP POLICY IF EXISTS "Users can view cat observations" ON observations;
DROP POLICY IF EXISTS "Users can insert cat observations" ON observations;
DROP POLICY IF EXISTS "Users can update cat observations" ON observations;

-- 新しいシンプルなポリシー（household_idを直接使用）
CREATE POLICY "allow_select_observations" ON observations
    FOR SELECT TO authenticated
    USING (
        household_id IN (
            SELECT household_id FROM household_members WHERE user_id = auth.uid()
        )
        OR cat_id IN (
            SELECT id FROM cats WHERE household_id IN (
                SELECT household_id FROM household_members WHERE user_id = auth.uid()
            )
        )
    );

CREATE POLICY "allow_insert_observations" ON observations
    FOR INSERT TO authenticated
    WITH CHECK (
        cat_id IN (
            SELECT id FROM cats WHERE household_id IN (
                SELECT household_id FROM household_members WHERE user_id = auth.uid()
            )
        )
    );

CREATE POLICY "allow_update_observations" ON observations
    FOR UPDATE TO authenticated
    USING (
        cat_id IN (
            SELECT id FROM cats WHERE household_id IN (
                SELECT household_id FROM household_members WHERE user_id = auth.uid()
            )
        )
    );

CREATE POLICY "allow_delete_observations" ON observations
    FOR DELETE TO authenticated
    USING (
        cat_id IN (
            SELECT id FROM cats WHERE household_id IN (
                SELECT household_id FROM household_members WHERE user_id = auth.uid()
            )
        )
    );

-- =====================================================
-- STEP 4: get_household_members 関数の再作成
-- (SECURITY DEFINERでRLSをバイパス)
-- =====================================================

CREATE OR REPLACE FUNCTION get_household_members(lookup_household_id UUID)
RETURNS TABLE (
  user_id UUID,
  role VARCHAR,
  joined_at TIMESTAMPTZ,
  email VARCHAR,
  name TEXT,
  avatar TEXT
)
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify requester is in the household
  IF NOT EXISTS (
    SELECT 1 FROM household_members
    WHERE household_id = lookup_household_id AND user_id = auth.uid()
  ) THEN
    RETURN; -- Empty result if not member
  END IF;

  RETURN QUERY
  SELECT
    hm.user_id,
    hm.role,
    hm.joined_at,
    u.email::VARCHAR,
    (u.raw_user_meta_data->>'full_name')::TEXT as name,
    (u.raw_user_meta_data->>'avatar_url')::TEXT as avatar
  FROM household_members hm
  JOIN auth.users u ON hm.user_id = u.id
  WHERE hm.household_id = lookup_household_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- STEP 5: household_members テーブルのRLSポリシー修正
-- (循環参照を回避するシンプルなポリシー)
-- =====================================================

ALTER TABLE household_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view members of their household" ON household_members;
DROP POLICY IF EXISTS "Users can join households" ON household_members;
DROP POLICY IF EXISTS "view_members" ON household_members;
DROP POLICY IF EXISTS "join_households" ON household_members;

-- シンプルなポリシー（auth.uid()を直接参照、循環なし）
CREATE POLICY "view_members" ON household_members
    FOR SELECT TO authenticated
    USING (user_id = auth.uid() OR household_id IN (
        SELECT hm2.household_id FROM household_members hm2 WHERE hm2.user_id = auth.uid()
    ));

CREATE POLICY "join_households" ON household_members
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

-- =====================================================
-- STEP 6: 確認クエリ
-- =====================================================

SELECT 
    u.id as user_id,
    u.display_name,
    u.household_id as user_table_household,
    count(hm.household_id) as member_table_entries
FROM users u
LEFT JOIN household_members hm ON u.id = hm.user_id
GROUP BY u.id, u.display_name, u.household_id;
