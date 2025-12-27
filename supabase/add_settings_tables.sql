-- Create care_task_defs table
CREATE TABLE IF NOT EXISTS care_task_defs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    icon TEXT NOT NULL,
    frequency TEXT NOT NULL,
    time_of_day TEXT,
    meal_slots JSONB,
    per_cat BOOLEAN DEFAULT false,
    enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS for care_task_defs
ALTER TABLE care_task_defs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access household care_task_defs" ON care_task_defs
    FOR ALL USING (household_id IN (
        SELECT household_id FROM users WHERE id = auth.uid()
    ));

-- Create notice_defs table
CREATE TABLE IF NOT EXISTS notice_defs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    kind TEXT DEFAULT 'check',
    cadence TEXT DEFAULT 'daily',
    due TEXT,
    choices TEXT[],
    input_type TEXT DEFAULT 'ok-notice',
    category TEXT DEFAULT 'physical',
    required BOOLEAN DEFAULT false,
    enabled BOOLEAN DEFAULT true,
    optional BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS for notice_defs
ALTER TABLE notice_defs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access household notice_defs" ON notice_defs
    FOR ALL USING (household_id IN (
        SELECT household_id FROM users WHERE id = auth.uid()
    ));

-- Update inventory table
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS stock_level TEXT DEFAULT 'full';
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS alert_enabled BOOLEAN DEFAULT true;

-- Update Realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE care_task_defs;
ALTER PUBLICATION supabase_realtime ADD TABLE notice_defs;
