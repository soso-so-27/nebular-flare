-- Surgical fix for medication_logs table schema
-- This ensures the column exists and RLS is set up even if the previous migration failed to add it

-- 1. Ensure household_id exists (required for RLS/Isolation)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'medication_logs' AND column_name = 'household_id') THEN
        ALTER TABLE medication_logs ADD COLUMN household_id UUID REFERENCES households(id);
    END IF;
END $$;

-- 2. Rename or ensure starts_at exists
DO $$
BEGIN
    -- If start_date exists, rename it to starts_at (most common mismatch)
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name = 'medication_logs' AND column_name = 'start_date') THEN
        ALTER TABLE medication_logs RENAME COLUMN start_date TO starts_at;
    ELSIF NOT EXISTS (SELECT 1 FROM information_schema.columns
                      WHERE table_name = 'medication_logs' AND column_name = 'starts_at') THEN
        ALTER TABLE medication_logs ADD COLUMN starts_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
END $$;

-- Enable RLS
ALTER TABLE medication_logs ENABLE ROW LEVEL SECURITY;

-- Re-apply policies (DROP first to avoid duplication errors)
DROP POLICY IF EXISTS "Users can view medication logs for their household" ON medication_logs;
CREATE POLICY "Users can view medication logs for their household" ON medication_logs
  FOR SELECT USING (
    household_id IN (
      SELECT household_id FROM users WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert medication logs for their household" ON medication_logs;
CREATE POLICY "Users can insert medication logs for their household" ON medication_logs
  FOR INSERT WITH CHECK (
    household_id IN (
      SELECT household_id FROM users WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update medication logs for their household" ON medication_logs;
CREATE POLICY "Users can update medication logs for their household" ON medication_logs
  FOR UPDATE USING (
    household_id IN (
      SELECT household_id FROM users WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete medication logs in their household" ON medication_logs;
CREATE POLICY "Users can delete medication logs in their household" ON medication_logs
  FOR DELETE USING (
    household_id IN (
      SELECT household_id FROM users WHERE id = auth.uid()
    )
  );
