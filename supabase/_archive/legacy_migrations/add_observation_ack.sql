-- Add acknowledged_at/by to observations
ALTER TABLE "public"."observations" 
  ADD COLUMN IF NOT EXISTS "acknowledged_at" timestamptz DEFAULT null,
  ADD COLUMN IF NOT EXISTS "acknowledged_by" uuid REFERENCES auth.users(id) DEFAULT null,
  ADD COLUMN IF NOT EXISTS "deleted_at" timestamptz DEFAULT null;

-- Ensure care_logs has deleted_at
ALTER TABLE "public"."care_logs"
  ADD COLUMN IF NOT EXISTS "deleted_at" timestamptz DEFAULT null;

-- Security note: RLS policies usually implicitly allow updating new columns if the policy is "FOR UPDATE TO authenticated USING ... WITH CHECK ...".
-- If specific columns are restricted in policy, we might need to alter it. 
-- For now assume standard household member policy covers it.
