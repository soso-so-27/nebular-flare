-- Add cat profile fields
-- Run this migration to add weight, microchip_id, and notes to cats table

ALTER TABLE cats ADD COLUMN IF NOT EXISTS weight DECIMAL(4,2);
ALTER TABLE cats ADD COLUMN IF NOT EXISTS microchip_id VARCHAR(100);
ALTER TABLE cats ADD COLUMN IF NOT EXISTS notes TEXT;

-- Create weight history table for tracking changes over time
CREATE TABLE IF NOT EXISTS cat_weight_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cat_id UUID NOT NULL REFERENCES cats(id) ON DELETE CASCADE,
  weight DECIMAL(4,2) NOT NULL,
  recorded_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT
);

-- Enable RLS
ALTER TABLE cat_weight_history ENABLE ROW LEVEL SECURITY;

-- RLS policies using household_id from cats
CREATE POLICY "Users can view weight history for their cats"
ON cat_weight_history FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM cats c
    JOIN household_members hm ON c.household_id = hm.household_id
    WHERE c.id = cat_weight_history.cat_id
    AND hm.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert weight history for their cats"
ON cat_weight_history FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM cats c
    JOIN household_members hm ON c.household_id = hm.household_id
    WHERE c.id = cat_weight_history.cat_id
    AND hm.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete weight history for their cats"
ON cat_weight_history FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM cats c
    JOIN household_members hm ON c.household_id = hm.household_id
    WHERE c.id = cat_weight_history.cat_id
    AND hm.user_id = auth.uid()
  )
);
