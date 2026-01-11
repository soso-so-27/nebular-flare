-- 猫の足あと機能 データベーステーブル
-- Cat Footprints Gamification System

-- =====================================================
-- 足あと履歴テーブル
-- =====================================================
CREATE TABLE IF NOT EXISTS cat_footprints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users ON DELETE CASCADE,
    household_id UUID NOT NULL REFERENCES households ON DELETE CASCADE,
    cat_id UUID REFERENCES cats ON DELETE SET NULL,
    action_type TEXT NOT NULL CHECK (action_type IN ('login', 'care', 'observation', 'photo', 'incident')),
    action_id UUID, -- 元のレコードID（オプション）
    points INT NOT NULL DEFAULT 1,
    earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_footprints_user ON cat_footprints(user_id);
CREATE INDEX IF NOT EXISTS idx_footprints_household ON cat_footprints(household_id);
CREATE INDEX IF NOT EXISTS idx_footprints_earned_at ON cat_footprints(earned_at DESC);

-- =====================================================
-- RLS (Row Level Security)
-- =====================================================
ALTER TABLE cat_footprints ENABLE ROW LEVEL SECURITY;

-- 世帯メンバーは自分の世帯の足あとを閲覧可能
CREATE POLICY "Users can view household footprints" ON cat_footprints
    FOR SELECT USING (household_id IN (
        SELECT household_id FROM users WHERE id = auth.uid()
    ));

-- ユーザーは自分の足あとのみ追加可能
CREATE POLICY "Users can insert own footprints" ON cat_footprints
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- =====================================================
-- 集計用RPC関数
-- =====================================================

-- 個人の足あと合計を取得
CREATE OR REPLACE FUNCTION get_user_footprints(target_user_id UUID)
RETURNS INT
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT COALESCE(SUM(points), 0)::INT
    FROM cat_footprints
    WHERE user_id = target_user_id;
$$;

-- 世帯の足あと合計を取得
CREATE OR REPLACE FUNCTION get_household_footprints(target_household_id UUID)
RETURNS INT
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT COALESCE(SUM(points), 0)::INT
    FROM cat_footprints
    WHERE household_id = target_household_id;
$$;

-- 家族メンバーごとの足あと内訳を取得
CREATE OR REPLACE FUNCTION get_household_footprints_breakdown(target_household_id UUID)
RETURNS TABLE (
    user_id UUID,
    display_name TEXT,
    total_points INT
)
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT 
        cf.user_id,
        u.display_name,
        COALESCE(SUM(cf.points), 0)::INT as total_points
    FROM cat_footprints cf
    JOIN users u ON cf.user_id = u.id
    WHERE cf.household_id = target_household_id
    GROUP BY cf.user_id, u.display_name
    ORDER BY total_points DESC;
$$;

-- 今日すでにログインボーナスをもらっているかチェック
CREATE OR REPLACE FUNCTION check_login_bonus_today(target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT EXISTS(
        SELECT 1 FROM cat_footprints
        WHERE user_id = target_user_id
        AND action_type = 'login'
        AND DATE(earned_at) = CURRENT_DATE
    );
$$;

-- Realtime有効化
ALTER PUBLICATION supabase_realtime ADD TABLE cat_footprints;
