-- Add ai_analysis column to cat_images table
ALTER TABLE cat_images ADD COLUMN IF NOT EXISTS ai_analysis JSONB;

-- Comment on column
COMMENT ON COLUMN cat_images.ai_analysis IS 'AI analysis result including labels, tags, and scores';
