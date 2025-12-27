-- オンボーディング用: householdsテーブルにINSERTポリシーを追加
-- 問題: 新規ユーザーにはまだhousehold_idがないため、householdを作成できない

-- 認証済みユーザーは新しいhouseholdを作成可能
CREATE POLICY "Authenticated users can create household" ON households
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- 作成したhouseholdを読めるようにSELECTポリシーも追加
-- (既存のポリシーが無限再帰起こしている可能性があるのでシンプルに)
-- まず既存ポリシーを確認
-- SELECT policyname FROM pg_policies WHERE tablename = 'households';
