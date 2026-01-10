-- =============================================================================
-- DB Trigger: Automatic User Profile Creation
-- =============================================================================
-- This trigger automatically creates a row in public.users when a new user
-- signs up via Supabase Auth. This ensures atomic user creation and prevents
-- inconsistencies where auth.users exists but public.users does not.
--
-- Run this SQL in Supabase Dashboard > SQL Editor
-- =============================================================================

-- Create the trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, display_name, email, created_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    NEW.email,
    NOW()
  )
  ON CONFLICT (id) DO NOTHING; -- Prevent errors if user already exists
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================================================
-- Verification: Test the trigger
-- =============================================================================
-- After running this script:
-- 1. Create a new user via your app's signup flow
-- 2. Check that a row was automatically created in public.users
-- 3. Verify the display_name matches what was provided during signup
-- =============================================================================
