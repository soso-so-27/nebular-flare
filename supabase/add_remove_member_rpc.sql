-- Function to remove a member from the household
-- Can be used by:
-- 1. Owner removing a member
-- 2. Member removing themselves (leaving)

CREATE OR REPLACE FUNCTION remove_household_member(target_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  requesting_user_id UUID;
  req_household_id UUID;
  req_role TEXT;
  target_membership RECORD;
BEGIN
  requesting_user_id := auth.uid();

  -- Get requester's household and role
  SELECT household_id, role INTO req_household_id, req_role
  FROM household_members
  WHERE user_id = requesting_user_id
  LIMIT 1;

  IF req_household_id IS NULL THEN
    RAISE EXCEPTION 'Requesting user is not part of any household';
  END IF;

  -- Check if target is in the same household
  SELECT * INTO target_membership
  FROM household_members
  WHERE user_id = target_user_id AND household_id = req_household_id;

  IF target_membership IS NULL THEN
    RAISE EXCEPTION 'Target user is not in your household';
  END IF;

  -- Permission Check
  IF requesting_user_id = target_user_id THEN
    -- Case 1: User leaving (always allowed, unless maybe sole owner? but let's allow for now)
    DELETE FROM household_members
    WHERE user_id = target_user_id AND household_id = req_household_id;
  ELSIF req_role = 'owner' THEN
    -- Case 2: Owner removing someone
    DELETE FROM household_members
    WHERE user_id = target_user_id AND household_id = req_household_id;
  ELSE
    RAISE EXCEPTION 'You do not have permission to remove this member';
  END IF;
END;
$$;
