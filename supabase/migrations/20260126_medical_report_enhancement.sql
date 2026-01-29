-- Medical Report Enhancement Migration
-- Adds fields for veterinary report generation

-- 1. Extend cats table with medical/prevention fields
ALTER TABLE cats ADD COLUMN IF NOT EXISTS flea_tick_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE cats ADD COLUMN IF NOT EXISTS flea_tick_product TEXT;
ALTER TABLE cats ADD COLUMN IF NOT EXISTS deworming_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE cats ADD COLUMN IF NOT EXISTS deworming_product TEXT;
ALTER TABLE cats ADD COLUMN IF NOT EXISTS heartworm_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE cats ADD COLUMN IF NOT EXISTS heartworm_product TEXT;
ALTER TABLE cats ADD COLUMN IF NOT EXISTS neutered_status TEXT CHECK (neutered_status IN ('neutered', 'intact', 'unknown'));
ALTER TABLE cats ADD COLUMN IF NOT EXISTS living_environment TEXT CHECK (living_environment IN ('indoor', 'outdoor', 'both'));
ALTER TABLE cats ADD COLUMN IF NOT EXISTS family_composition TEXT;

-- 2. Extend incidents table for medical report
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS onset_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS last_normal_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS symptom_details JSONB;
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS batch_id UUID;
CREATE INDEX IF NOT EXISTS idx_incidents_batch_id ON incidents(batch_id);
CREATE INDEX IF NOT EXISTS idx_incidents_onset_at ON incidents(onset_at);

-- 3. Create medication_logs table
CREATE TABLE IF NOT EXISTS medication_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cat_id UUID REFERENCES cats(id) ON DELETE CASCADE,
  household_id UUID REFERENCES households(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  dosage TEXT,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE,
  frequency TEXT CHECK (frequency IN ('once', 'daily', 'twice_daily', 'weekly', 'as_needed')),
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS for medication_logs
ALTER TABLE medication_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view medication logs in their household" ON medication_logs
  FOR SELECT USING (
    household_id IN (
      SELECT household_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can insert medication logs in their household" ON medication_logs
  FOR INSERT WITH CHECK (
    household_id IN (
      SELECT household_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update medication logs in their household" ON medication_logs
  FOR UPDATE USING (
    household_id IN (
      SELECT household_id FROM users WHERE id = auth.uid()
    )
  );

-- 4. Create weekly_album_settings table
CREATE TABLE IF NOT EXISTS weekly_album_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  cat_id UUID REFERENCES cats(id) ON DELETE CASCADE,
  week_key TEXT NOT NULL, -- e.g., "2026-W04"
  layout_type TEXT NOT NULL CHECK (layout_type IN ('hero3', 'grid4', 'filmstrip')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, cat_id, week_key)
);

-- RLS for weekly_album_settings
ALTER TABLE weekly_album_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own album settings" ON weekly_album_settings
  FOR ALL USING (user_id = auth.uid());
