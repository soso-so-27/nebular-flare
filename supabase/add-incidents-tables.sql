-- インシデント管理テーブル
-- 猫の体調不良や異変を記録・追跡

-- インシデントテーブル
CREATE TABLE IF NOT EXISTS incidents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id UUID NOT NULL REFERENCES households ON DELETE CASCADE,
    cat_id UUID NOT NULL REFERENCES cats ON DELETE CASCADE,
    type TEXT NOT NULL, -- 'vomit', 'diarrhea', 'injury', 'no_energy', 'sneeze', 'other'
    status TEXT NOT NULL DEFAULT 'watching', -- 'watching', 'hospital', 'resolved'
    severity TEXT NOT NULL DEFAULT 'medium', -- 'low', 'medium', 'high'
    photos TEXT[] DEFAULT '{}', -- Array of storage paths
    note TEXT,
    created_by UUID REFERENCES users,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE,
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- インシデント更新履歴テーブル
CREATE TABLE IF NOT EXISTS incident_updates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    incident_id UUID NOT NULL REFERENCES incidents ON DELETE CASCADE,
    user_id UUID REFERENCES users,
    note TEXT,
    photos TEXT[] DEFAULT '{}',
    status_change TEXT, -- New status if changed
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_incidents_household_id ON incidents(household_id);
CREATE INDEX IF NOT EXISTS idx_incidents_cat_id ON incidents(cat_id);
CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents(status);
CREATE INDEX IF NOT EXISTS idx_incidents_created_at ON incidents(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_incident_updates_incident_id ON incident_updates(incident_id);

-- RLS有効化
ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE incident_updates ENABLE ROW LEVEL SECURITY;

-- RLSポリシー：世帯メンバーのみアクセス可能
CREATE POLICY "Users can access household incidents" ON incidents
    FOR ALL USING (household_id IN (
        SELECT household_id FROM users WHERE id = auth.uid()
    ));

CREATE POLICY "Users can access incident updates" ON incident_updates
    FOR ALL USING (incident_id IN (
        SELECT id FROM incidents WHERE household_id IN (
            SELECT household_id FROM users WHERE id = auth.uid()
        )
    ));

-- Realtime有効化（既に追加されている場合はスキップ）
DO $$
BEGIN
    -- Check if incidents is already in publication
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = 'incidents'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE incidents;
    END IF;
    
    -- Check if incident_updates is already in publication
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = 'incident_updates'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE incident_updates;
    END IF;
END $$;

-- updated_atを自動更新するトリガー
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_incidents_updated_at BEFORE UPDATE ON incidents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
