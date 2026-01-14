-- Migration: Optimize Gallery Indices
-- Created: 2026-01-12

-- 1. Cat Images Index
CREATE INDEX IF NOT EXISTS idx_cat_images_cat_id_created ON cat_images(cat_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cat_images_household_id ON cat_images(cat_id) WHERE cat_id IN (SELECT id FROM cats);

-- 2. Care Logs Index
-- Index for unnesting images lookup
CREATE INDEX IF NOT EXISTS idx_care_logs_cat_id_done_at ON care_logs(cat_id, done_at DESC) WHERE images IS NOT NULL AND deleted_at IS NULL;

-- 3. Observations Index
-- Index for unnesting images lookup
CREATE INDEX IF NOT EXISTS idx_observations_cat_id_recorded_at ON observations(cat_id, recorded_at DESC) WHERE images IS NOT NULL AND deleted_at IS NULL;

-- 4. Cats Index
CREATE INDEX IF NOT EXISTS idx_cats_household_id ON cats(household_id) WHERE deleted_at IS NULL;
