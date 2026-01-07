-- ねこログ DB Schema
-- Run this in Supabase SQL Editor

-- 世帯（家族単位）
CREATE TABLE IF NOT EXISTS households (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- ユーザー
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
    household_id UUID REFERENCES households,
    display_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 猫
CREATE TABLE IF NOT EXISTS cats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id UUID NOT NULL REFERENCES households ON DELETE CASCADE,
    name TEXT NOT NULL,
    avatar TEXT,
    sex TEXT,
    birthday DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES users
);

-- お世話ログ（世帯単位のアクション：朝ごはん、夜ごはん、トイレ掃除）
CREATE TABLE IF NOT EXISTS care_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id UUID NOT NULL REFERENCES households ON DELETE CASCADE,
    cat_id UUID REFERENCES cats,  -- NULLable for household-level tasks
    type TEXT NOT NULL,  -- 'breakfast', 'dinner', 'toilet_clean'
    done_by UUID REFERENCES users,
    done_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- 猫の観察（猫ごとの記録）
CREATE TABLE IF NOT EXISTS observations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cat_id UUID NOT NULL REFERENCES cats ON DELETE CASCADE,
    type TEXT NOT NULL,  -- 'appetite', 'toilet', 'vomit'
    value TEXT NOT NULL,  -- 'いつも通り', 'ちょっと違う', etc.
    recorded_by UUID REFERENCES users,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- 在庫
CREATE TABLE IF NOT EXISTS inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id UUID NOT NULL REFERENCES households ON DELETE CASCADE,
    label TEXT NOT NULL,
    last_bought DATE,
    range_min INT DEFAULT 30,
    range_max INT DEFAULT 45,
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Row Level Security (RLS)
ALTER TABLE households ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE cats ENABLE ROW LEVEL SECURITY;
ALTER TABLE care_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only access their household's data
CREATE POLICY "Users can view own household" ON households
    FOR ALL USING (id IN (
        SELECT household_id FROM users WHERE id = auth.uid()
    ));

CREATE POLICY "Users can view household members" ON users
    FOR ALL USING (household_id IN (
        SELECT household_id FROM users WHERE id = auth.uid()
    ));

CREATE POLICY "Users can access household cats" ON cats
    FOR ALL USING (household_id IN (
        SELECT household_id FROM users WHERE id = auth.uid()
    ));

CREATE POLICY "Users can access household care_logs" ON care_logs
    FOR ALL USING (household_id IN (
        SELECT household_id FROM users WHERE id = auth.uid()
    ));

CREATE POLICY "Users can access cat observations" ON observations
    FOR ALL USING (cat_id IN (
        SELECT id FROM cats WHERE household_id IN (
            SELECT household_id FROM users WHERE id = auth.uid()
        )
    ));

CREATE POLICY "Users can access household inventory" ON inventory
    FOR ALL USING (household_id IN (
        SELECT household_id FROM users WHERE id = auth.uid()
    ));

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE care_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE observations;
ALTER PUBLICATION supabase_realtime ADD TABLE inventory;

-- インシデント管理（猫の体調不良や異変の記録・追跡）
CREATE TABLE IF NOT EXISTS incidents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id UUID NOT NULL REFERENCES households ON DELETE CASCADE,
    cat_id UUID NOT NULL REFERENCES cats ON DELETE CASCADE,
    type TEXT NOT NULL, -- 'vomit', 'diarrhea', 'injury', 'no_energy', 'sneeze', 'other'
    status TEXT NOT NULL DEFAULT 'watching', -- 'watching', 'hospital', 'resolved'
    severity TEXT NOT NULL DEFAULT 'medium', -- 'low', 'medium', 'high'
    photos TEXT[] DEFAULT '{}',
    note TEXT,
    created_by UUID REFERENCES users,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE,
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS incident_updates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    incident_id UUID NOT NULL REFERENCES incidents ON DELETE CASCADE,
    user_id UUID REFERENCES users,
    note TEXT,
    photos TEXT[] DEFAULT '{}',
    status_change TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_incidents_household_id ON incidents(household_id);
CREATE INDEX IF NOT EXISTS idx_incidents_cat_id ON incidents(cat_id);
CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents(status);
CREATE INDEX IF NOT EXISTS idx_incidents_created_at ON incidents(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_incident_updates_incident_id ON incident_updates(incident_id);

-- RLS
ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE incident_updates ENABLE ROW LEVEL SECURITY;

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

-- Realtime for incidents (skip if already added)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = 'incidents'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE incidents;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = 'incident_updates'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE incident_updates;
    END IF;
END $$;

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_incidents_updated_at BEFORE UPDATE ON incidents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
