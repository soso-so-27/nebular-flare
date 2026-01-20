-- migration for safely consuming footprints (v3: column name fixed to 'points')
CREATE OR REPLACE FUNCTION safely_consume_footprints(
  p_action_type TEXT,
  p_amount INTEGER,
  p_cat_id UUID DEFAULT NULL,
  p_memo TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_household_id UUID;
  v_current_total INTEGER;
BEGIN
  -- Get current user ID
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  -- Get user's household_id from users table
  SELECT household_id INTO v_household_id FROM users WHERE id = v_user_id;
  IF v_household_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No household found');
  END IF;

  -- Calculate current total (server-side for correctness)
  -- The column name in cat_footprints is 'points'
  SELECT COALESCE(SUM(points), 0) INTO v_current_total
  FROM cat_footprints
  WHERE household_id = v_household_id;

  -- Check if enough points (p_amount is positive cost)
  IF v_current_total < p_amount THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient points', 'current_total', v_current_total);
  END IF;

  -- Insert negative amount into 'points' column
  INSERT INTO cat_footprints (user_id, household_id, cat_id, action_type, points, memo, earned_at)
  VALUES (v_user_id, v_household_id, p_cat_id, p_action_type, -p_amount, p_memo, NOW());

  RETURN jsonb_build_object('success', true, 'new_total', v_current_total - p_amount);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;
