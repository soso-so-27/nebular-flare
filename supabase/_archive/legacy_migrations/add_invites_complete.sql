-- 1. Household Invites Table
CREATE TABLE IF NOT EXISTS household_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  code VARCHAR(20) NOT NULL UNIQUE,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days')
);

ALTER TABLE household_invites ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Members view invites" ON household_invites FOR SELECT
USING (EXISTS (SELECT 1 FROM household_members hm WHERE hm.household_id = household_invites.household_id AND hm.user_id = auth.uid()));

CREATE POLICY "Members create invites" ON household_invites FOR INSERT
WITH CHECK (EXISTS (SELECT 1 FROM household_members hm WHERE hm.household_id = household_invites.household_id AND hm.user_id = auth.uid()));

CREATE POLICY "Public invite lookup" ON household_invites FOR SELECT USING (true);


-- 2. Function to Get Household Members (Securely)
CREATE OR REPLACE FUNCTION get_household_members(lookup_household_id UUID)
RETURNS TABLE (
  user_id UUID,
  role VARCHAR,
  joined_at TIMESTAMPTZ,
  email VARCHAR,
  name TEXT,
  avatar TEXT
)
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify requester is in the household
  IF NOT EXISTS (
    SELECT 1 FROM household_members
    WHERE household_id = lookup_household_id AND user_id = auth.uid()
  ) THEN
    RETURN; -- Empty result if not member
  END IF;

  RETURN QUERY
  SELECT
    hm.user_id,
    hm.role,
    hm.joined_at,
    u.email::VARCHAR,
    (u.raw_user_meta_data->>'full_name')::TEXT as name,
    (u.raw_user_meta_data->>'avatar_url')::TEXT as avatar
  FROM household_members hm
  JOIN auth.users u ON hm.user_id = u.id
  WHERE hm.household_id = lookup_household_id;
END;
$$ LANGUAGE plpgsql;


-- 3. Function to Join Household via Code
CREATE OR REPLACE FUNCTION join_household_by_code(invite_code TEXT)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_household_id UUID;
  current_user_id UUID;
BEGIN
  current_user_id := auth.uid();

  -- Get invite info
  SELECT household_id INTO target_household_id
  FROM household_invites
  WHERE code = invite_code
  AND expires_at > NOW();

  IF target_household_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Invalid or expired code');
  END IF;

  -- Check if already member
  IF EXISTS (SELECT 1 FROM household_members WHERE household_id = target_household_id AND user_id = current_user_id) THEN
    RETURN jsonb_build_object('success', true, 'message', 'Already a member', 'household_id', target_household_id);
  END IF;

  -- Insert member
  INSERT INTO household_members (household_id, user_id, role)
  VALUES (target_household_id, current_user_id, 'member');

  -- Update user profile default household if null
  UPDATE user_profiles
  SET household_id = target_household_id
  WHERE id = current_user_id AND household_id IS NULL;

  RETURN jsonb_build_object('success', true, 'household_id', target_household_id);
END;
$$ LANGUAGE plpgsql;
