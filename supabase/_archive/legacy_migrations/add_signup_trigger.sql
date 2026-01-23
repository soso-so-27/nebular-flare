-- 新規ユーザー登録時に自動的に世帯を作成し、メンバーとして追加するトリガー
-- これがないと、新しく登録したユーザー（オーナー）が member テーブルに存在せず、一覧に表示されません

-- 1. トリガー関数の作成
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  new_household_id UUID;
BEGIN
  -- 新しい世帯を作成
  INSERT INTO public.households (name)
  VALUES ('My Family')
  RETURNING id INTO new_household_id;

  -- ユーザーを users テーブルに追加 (auth.usersのコピー)
  -- 既存のトリガーがあるかもしれないが、念のためUPSERT
  INSERT INTO public.users (id, household_id, display_name, avatar_url)
  VALUES (
    NEW.id,
    new_household_id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO UPDATE
  SET household_id = EXCLUDED.household_id;

  -- ユーザーを household_members テーブルにオーナーとして追加
  INSERT INTO public.household_members (household_id, user_id, role)
  VALUES (new_household_id, NEW.id, 'owner');

  RETURN NEW;
END;
$$;

-- 2. トリガーの作成
-- 既存のトリガーがあれば削除してから再作成
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. 既存ユーザーの修復（バックフィル）
-- まだメンバーテーブルにいないユーザーを、自分のhousehold_idに基づいて登録
DO $$
DECLARE
    u RECORD;
BEGIN
    FOR u IN SELECT id, household_id FROM public.users WHERE household_id IS NOT NULL LOOP
        -- household_membersにいない場合のみ追加
        IF NOT EXISTS (SELECT 1 FROM public.household_members WHERE user_id = u.id AND household_id = u.household_id) THEN
            INSERT INTO public.household_members (household_id, user_id, role)
            VALUES (u.household_id, u.id, 'owner');
        END IF;
    END LOOP;
END $$;

SELECT 'Created handle_new_user trigger and backfilled members' as status;
