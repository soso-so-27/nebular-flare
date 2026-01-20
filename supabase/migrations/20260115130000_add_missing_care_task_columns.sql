-- Migration: Add missing columns for advanced care task settings
ALTER TABLE care_task_defs 
ADD COLUMN IF NOT EXISTS frequency_type TEXT DEFAULT 'fixed',
ADD COLUMN IF NOT EXISTS interval_hours INTEGER,
ADD COLUMN IF NOT EXISTS frequency_count INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'normal',
ADD COLUMN IF NOT EXISTS start_offset_minutes INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS user_notes TEXT,
ADD COLUMN IF NOT EXISTS reminder_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS reminder_offset_minutes INTEGER DEFAULT 15,
ADD COLUMN IF NOT EXISTS valid_duration_minutes INTEGER;

-- Update existing rows to have default values if null
UPDATE care_task_defs SET frequency_type = 'fixed' WHERE frequency_type IS NULL;
UPDATE care_task_defs SET frequency_count = 1 WHERE frequency_count IS NULL;
UPDATE care_task_defs SET priority = 'normal' WHERE priority IS NULL;
UPDATE care_task_defs SET start_offset_minutes = 0 WHERE start_offset_minutes IS NULL;
UPDATE care_task_defs SET reminder_enabled = false WHERE reminder_enabled IS NULL;
UPDATE care_task_defs SET reminder_offset_minutes = 15 WHERE reminder_offset_minutes IS NULL;
