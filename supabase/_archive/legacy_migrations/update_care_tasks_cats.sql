-- Add target_cat_ids column to care_task_defs table
ALTER TABLE care_task_defs ADD COLUMN IF NOT EXISTS target_cat_ids TEXT[];

-- Optional: Comment on column
COMMENT ON COLUMN care_task_defs.target_cat_ids IS 'List of cat IDs this task specifically applies to. If null or empty, applies to all cats (if per_cat is true).';
