-- 家族招待（household_invites）とメンバー管理（household_members）のRLSを修正・整理するスクリプト

BEGIN;

-- --------------------------------------------------------
-- 1. household_invites (招待コード管理)
-- --------------------------------------------------------
ALTER TABLE household_invites ENABLE ROW LEVEL SECURITY;

-- 既存の重複・競合ポリシーを全て削除
DROP POLICY IF EXISTS "Members view invites" ON household_invites;
DROP POLICY IF EXISTS "Members create invites" ON household_invites;
DROP POLICY IF EXISTS "Public invite lookup" ON household_invites;
DROP POLICY IF EXISTS "Members can view their household invites" ON household_invites;
DROP POLICY IF EXISTS "Members can create household invites" ON household_invites;
DROP POLICY IF EXISTS "Anyone can lookup invite by code" ON household_invites;
DROP POLICY IF EXISTS "users_delete_own_invites" ON household_invites;

-- 新しいポリシーの作成

-- 【参照】招待コードは誰でも参照可能（参加フローのため）、または自分の世帯のもの
-- セキュリティ向上のため、本来は招待コードを知っている人のみですが、簡易的にTRUEで許可し、参加ロジック側で検証します
CREATE POLICY "Public can view invites" ON household_invites
    FOR SELECT USING (true);

-- 【作成】自分の世帯に対する招待のみ作成可能
-- usersテーブルのhousehold_id情報を信頼元とします（これが他ポリシー修正と整合します）
CREATE POLICY "Members can create invites for own household" ON household_invites
    FOR INSERT WITH CHECK (
        household_id IN (SELECT household_id FROM users WHERE id = auth.uid())
    );

-- 【削除】自分の世帯の招待は削除可能
CREATE POLICY "Members can delete invites for own household" ON household_invites
    FOR DELETE USING (
        household_id IN (SELECT household_id FROM users WHERE id = auth.uid())
    );


-- --------------------------------------------------------
-- 2. household_members (メンバー一覧)
-- --------------------------------------------------------
-- アプリがRPCを使っている場合はこのテーブル直接参照は少ないかもしれませんが、念のため修正
ALTER TABLE household_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members select own household" ON household_members;
DROP POLICY IF EXISTS "Users can view members of their household" ON household_members;

CREATE POLICY "Users can view members of their household" ON household_members
    FOR SELECT USING (
        household_id IN (SELECT household_id FROM users WHERE id = auth.uid())
    );

-- メンバー追加・削除はRPC（get_household_members, remove_household_member）経由が主ですが、
-- 万が一直接追加する場合（参加時など）のために
CREATE POLICY "Users can insert membership for self" ON household_members
    FOR INSERT WITH CHECK (
        user_id = auth.uid()
    );

COMMIT;

SELECT 'RLS for invites and members fixed' as status;
