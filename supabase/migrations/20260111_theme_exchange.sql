-- ==============================================
-- Theme Exchange System
-- ==============================================

-- Theme items available for purchase
CREATE TABLE IF NOT EXISTS theme_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    type TEXT NOT NULL DEFAULT 'theme', -- 'theme', 'accent', 'icon_pack'
    preview_image TEXT, -- URL to preview image
    cost INTEGER NOT NULL DEFAULT 100,
    css_variables JSONB, -- Custom CSS variables for the theme
    is_default BOOLEAN DEFAULT false,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- User unlocked themes
CREATE TABLE IF NOT EXISTS user_unlocked_themes (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    theme_id UUID REFERENCES theme_items(id) ON DELETE CASCADE,
    unlocked_at TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (user_id, theme_id)
);

-- Add active theme to users table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'active_theme_id') THEN
        ALTER TABLE users ADD COLUMN active_theme_id UUID REFERENCES theme_items(id);
    END IF;
END $$;

-- ==============================================
-- Row Level Security
-- ==============================================

ALTER TABLE theme_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_unlocked_themes ENABLE ROW LEVEL SECURITY;

-- Theme items are public read
CREATE POLICY "Theme items are publicly readable"
    ON theme_items FOR SELECT
    USING (true);

-- Users can view their own unlocked themes
CREATE POLICY "Users can view their unlocked themes"
    ON user_unlocked_themes FOR SELECT
    USING (auth.uid() = user_id);

-- Users can insert their own unlocked themes
CREATE POLICY "Users can unlock themes"
    ON user_unlocked_themes FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- ==============================================
-- Function to purchase a theme
-- ==============================================

CREATE OR REPLACE FUNCTION purchase_theme(
    p_theme_id UUID
) RETURNS JSONB AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_household_id UUID;
    v_theme_cost INTEGER;
    v_theme_name TEXT;
    v_user_points INTEGER;
    v_already_owned BOOLEAN;
BEGIN
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
    END IF;

    -- Get user's household
    SELECT household_id INTO v_household_id FROM users WHERE id = v_user_id;
    IF v_household_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'No household found');
    END IF;

    -- Get theme details
    SELECT cost, name INTO v_theme_cost, v_theme_name FROM theme_items WHERE id = p_theme_id;
    IF v_theme_cost IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Theme not found');
    END IF;

    -- Check if already owned
    SELECT EXISTS(
        SELECT 1 FROM user_unlocked_themes 
        WHERE user_id = v_user_id AND theme_id = p_theme_id
    ) INTO v_already_owned;
    
    IF v_already_owned THEN
        RETURN jsonb_build_object('success', false, 'error', 'Already owned');
    END IF;

    -- Get user's total points (household total)
    SELECT COALESCE(SUM(points), 0) INTO v_user_points 
    FROM cat_footprints 
    WHERE household_id = v_household_id;

    IF v_user_points < v_theme_cost THEN
        RETURN jsonb_build_object(
            'success', false, 
            'error', 'Insufficient points',
            'required', v_theme_cost,
            'current', v_user_points
        );
    END IF;

    -- Deduct points (insert negative footprint)
    INSERT INTO cat_footprints (user_id, household_id, action_type, points, note)
    VALUES (v_user_id, v_household_id, 'purchase', -v_theme_cost, 'テーマ購入: ' || v_theme_name);

    -- Unlock theme for user
    INSERT INTO user_unlocked_themes (user_id, theme_id)
    VALUES (v_user_id, p_theme_id);

    -- Set as active theme
    UPDATE users SET active_theme_id = p_theme_id WHERE id = v_user_id;

    RETURN jsonb_build_object(
        'success', true, 
        'theme_id', p_theme_id,
        'cost', v_theme_cost,
        'remaining_points', v_user_points - v_theme_cost
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================
-- Insert Default Themes
-- ==============================================

INSERT INTO theme_items (name, description, type, cost, is_default, sort_order, css_variables) VALUES
('デフォルト', 'シンプルで心地よい標準テーマ', 'theme', 0, true, 0, 
 '{"--theme-primary": "#7CAA8E", "--theme-accent": "#E8B4A0", "--theme-bg": "#FAF9F7"}'::jsonb),

('夕暮れモード', '温かみのあるオレンジ系アクセント', 'theme', 50, false, 1,
 '{"--theme-primary": "#D97706", "--theme-accent": "#F59E0B", "--theme-bg": "#FFFBEB"}'::jsonb),

('森の中', '落ち着いた深緑ベースのテーマ', 'theme', 100, false, 2,
 '{"--theme-primary": "#166534", "--theme-accent": "#22C55E", "--theme-bg": "#F0FDF4"}'::jsonb),
 
('夜空', 'ダークブルーのナイトモード', 'theme', 150, false, 3,
 '{"--theme-primary": "#1E40AF", "--theme-accent": "#3B82F6", "--theme-bg": "#1E293B"}'::jsonb),

('桜', '春を感じるピンク系テーマ', 'theme', 200, false, 4,
 '{"--theme-primary": "#DB2777", "--theme-accent": "#F472B6", "--theme-bg": "#FDF2F8"}'::jsonb),

('ラベンダー', '穏やかな紫のリラックステーマ', 'theme', 150, false, 5,
 '{"--theme-primary": "#7C3AED", "--theme-accent": "#A78BFA", "--theme-bg": "#F5F3FF"}'::jsonb)

ON CONFLICT DO NOTHING;
