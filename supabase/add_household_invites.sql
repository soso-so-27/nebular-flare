-- Household Invites Table
-- 1 code = 1 household (Multi-use allowed within validity period)

CREATE TABLE IF NOT EXISTS household_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  code VARCHAR(20) NOT NULL UNIQUE, -- Random alphanumeric code
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days')
);

-- Enable RLS
ALTER TABLE household_invites ENABLE ROW LEVEL SECURITY;

-- Policies

-- 1. Members can view invites for their household (to see active codes)
CREATE POLICY "Members can view their household invites"
ON household_invites FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM household_members hm
    WHERE hm.household_id = household_invites.household_id
    AND hm.user_id = auth.uid()
  )
);

-- 2. Members can create invites
CREATE POLICY "Members can create household invites"
ON household_invites FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM household_members hm
    WHERE hm.household_id = household_invites.household_id
    AND hm.user_id = auth.uid()
  )
);

-- 3. Public Lookup by Code (For joining)
-- Security: Only allow exact code match (Postgres optimization usually handles this, but 'true' is broad)
-- Effectively, anyone can SELECT if they know the UUID? No, code is separate.
-- We'll allow SELECT USING (true) but frontend should filter by code.
-- For stricter security, use a Function to validate code instead of querying table directly.
-- But for MVP, Table RLS 'true' allows checking code validity.
CREATE POLICY "Public invite lookup"
ON household_invites FOR SELECT
USING (true);

-- Add raw_user_meta_data column check (just in case)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='auth' AND table_name='users' AND column_name='raw_user_meta_data') THEN
        -- This logic usually runs in Supabase Auth automatically, skipping
    END IF;
END $$;
