-- Enforce NOT NULL on critical columns for Data Validation

-- 1. Cats
-- Ensure name and household_id are not null
ALTER TABLE cats ALTER COLUMN name SET NOT NULL;
ALTER TABLE cats ALTER COLUMN household_id SET NOT NULL;

-- 2. Inventory
-- Ensure label and household_id are not null
ALTER TABLE inventory ALTER COLUMN label SET NOT NULL;
ALTER TABLE inventory ALTER COLUMN household_id SET NOT NULL;

-- 3. Care Task Defs (Double Check)
ALTER TABLE care_task_defs ALTER COLUMN title SET NOT NULL;
ALTER TABLE care_task_defs ALTER COLUMN household_id SET NOT NULL;

-- 4. Notice Defs (Double Check)
ALTER TABLE notice_defs ALTER COLUMN title SET NOT NULL;
ALTER TABLE notice_defs ALTER COLUMN household_id SET NOT NULL;

-- 5. Household Members
ALTER TABLE household_members ALTER COLUMN role SET NOT NULL;
