-- Add vaccine fields to cats table
ALTER TABLE cats ADD COLUMN IF NOT EXISTS last_vaccine_date DATE;
ALTER TABLE cats ADD COLUMN IF NOT EXISTS vaccine_type TEXT;

COMMENT ON COLUMN cats.last_vaccine_date IS '直近のワクチン接種日';
COMMENT ON COLUMN cats.vaccine_type IS 'ワクチンの種類（3種、5種など）';
