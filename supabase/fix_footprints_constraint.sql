-- Migration to update action_type check constraint in cat_footprints table
-- This allows point consumption actions like 'exchange'

-- 1. Drop the old constraint
ALTER TABLE cat_footprints DROP CONSTRAINT IF EXISTS cat_footprints_action_type_check;

-- 2. Add the new constraint including 'exchange'
-- Adding 'exchange' to support point consumption for themes/layouts
ALTER TABLE cat_footprints ADD CONSTRAINT cat_footprints_action_type_check 
    CHECK (action_type IN ('login', 'care', 'observation', 'photo', 'incident', 'exchange'));

-- Note: If you add more action types in the future, update this list accordingly.
