-- Add notes column to care_logs
ALTER TABLE care_logs 
ADD COLUMN IF NOT EXISTS notes text;

-- Add notes column to observations
ALTER TABLE observations 
ADD COLUMN IF NOT EXISTS notes text;
