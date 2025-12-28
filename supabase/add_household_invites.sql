-- Household Invites Table
-- Create a table to store household invitation codes

CREATE TABLE IF NOT EXISTS household_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  code VARCHAR(20) NOT NULL UNIQUE,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  used_by UUID REFERENCES auth.users(id),
  used_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE household_invites ENABLE ROW LEVEL SECURITY;

-- Policies: Members can view invites for their household
CREATE POLICY "Members can view their household invites"
ON household_invites FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM household_members hm
    WHERE hm.household_id = household_invites.household_id
    AND hm.user_id = auth.uid()
  )
);

-- Policies: Members can create invites for their household
CREATE POLICY "Members can create household invites"
ON household_invites FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM household_members hm
    WHERE hm.household_id = household_invites.household_id
    AND hm.user_id = auth.uid()
  )
);

-- Policies: Anyone can select by code (for accepting invites)
CREATE POLICY "Anyone can lookup invite by code"
ON household_invites FOR SELECT
USING (true);

-- Add profile fields to users if not exist
-- (name, avatar for displaying in member list)
ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS raw_user_meta_data JSONB;

-- Create view for household members with user info
CREATE OR REPLACE VIEW household_members_view AS
SELECT 
  hm.household_id,
  hm.user_id,
  hm.role,
  hm.joined_at,
  u.email,
  u.raw_user_meta_data->>'full_name' as name,
  u.raw_user_meta_data->>'avatar_url' as avatar
FROM household_members hm
JOIN auth.users u ON hm.user_id = u.id;
