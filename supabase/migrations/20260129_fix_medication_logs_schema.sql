-- Surgical fix for medication_logs table schema mismatch
-- This ensures the column exists and RLS is set up even if the previous migration failed to add it

-- 1. Add household_id if missing
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'medication_logs' AND column_name = 'household_id') THEN
        ALTER TABLE medication_logs ADD COLUMN household_id UUID REFERENCES households(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 2. Ensure RLS is enabled
ALTER TABLE medication_logs ENABLE ROW LEVEL SECURITY;

-- 3. Re-apply policies (DROP first to avoid duplication errors)
DROP POLICY IF EXISTS "Users can view medication logs in their household" ON medication_logs;
CREATE POLICY "Users can view medication logs in their household" ON medication_logs
  FOR SELECT USING (
    household_id IN (
      SELECT household_id FROM users WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert medication logs in their household" ON medication_logs;
CREATE POLICY "Users can insert medication logs in their household" ON medication_logs
  FOR INSERT WITH CHECK (
    household_id IN (
      SELECT household_id FROM users WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update medication logs in their household" ON medication_logs;
CREATE POLICY "Users can update medication logs in their household" ON medication_logs
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
