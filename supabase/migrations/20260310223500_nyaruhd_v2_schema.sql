-- にゃるほど AI実装Phase 1: DBスキーマ構築

-- 5-5. photos
CREATE TABLE IF NOT EXISTS photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL,
  source text DEFAULT 'camera_roll',
  taken_at timestamptz,
  imported_at timestamptz DEFAULT now(),
  storage_path text NOT NULL,
  thumbnail_path text,
  width int,
  height int,
  favorite boolean default false,
  deleted_at timestamptz null,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 5-6. photo_cat_links
CREATE TABLE IF NOT EXISTS photo_cat_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  photo_id uuid REFERENCES photos(id) ON DELETE CASCADE,
  cat_id uuid NOT NULL,
  confidence numeric(5,4),
  is_primary boolean default false,
  created_at timestamptz DEFAULT now()
);

-- 5-7. photo_analysis_jobs
CREATE TABLE IF NOT EXISTS photo_analysis_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  photo_id uuid REFERENCES photos(id) ON DELETE CASCADE,
  status text DEFAULT 'queued',
  attempt_count int default 0,
  requested_at timestamptz DEFAULT now(),
  started_at timestamptz null,
  finished_at timestamptz null,
  error_message text null,
  model_name text null,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 5-8. photo_analysis_results
CREATE TABLE IF NOT EXISTS photo_analysis_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  photo_id uuid unique REFERENCES photos(id) ON DELETE CASCADE,
  raw_json jsonb,
  pose_tags jsonb DEFAULT '[]'::jsonb,
  action_tags jsonb DEFAULT '[]'::jsonb,
  place_tags jsonb DEFAULT '[]'::jsonb,
  mood_tags jsonb DEFAULT '[]'::jsonb,
  object_tags jsonb DEFAULT '[]'::jsonb,
  scene_summary text,
  quality_score numeric(5,4),
  confidence numeric(5,4),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 5-9. collection_definitions
CREATE TABLE IF NOT EXISTS collection_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text unique,
  name text,
  category text, -- pose / action / place / mood / rare
  description text,
  level_thresholds jsonb,
  is_active boolean default true,
  sort_order int,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 5-10. collection_rules
CREATE TABLE IF NOT EXISTS collection_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_definition_id uuid REFERENCES collection_definitions(id) ON DELETE CASCADE,
  rule_json jsonb,
  priority int default 0,
  is_active boolean default true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 5-11. cat_collection_items
CREATE TABLE IF NOT EXISTS cat_collection_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cat_id uuid NOT NULL,
  collection_definition_id uuid REFERENCES collection_definitions(id) ON DELETE CASCADE,
  photo_count int default 0,
  latest_photo_id uuid REFERENCES photos(id) ON DELETE SET NULL,
  first_detected_at timestamptz,
  last_detected_at timestamptz,
  current_level int default 0,
  score numeric(8,2) default 0,
  metadata jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(cat_id, collection_definition_id)
);

-- 5-12. cat_collection_photos
CREATE TABLE IF NOT EXISTS cat_collection_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cat_id uuid NOT NULL,
  collection_definition_id uuid REFERENCES collection_definitions(id) ON DELETE CASCADE,
  photo_id uuid REFERENCES photos(id) ON DELETE CASCADE,
  confidence numeric(5,4),
  created_at timestamptz DEFAULT now(),
  UNIQUE(cat_id, collection_definition_id, photo_id)
);

-- 5-13. discoveries
CREATE TABLE IF NOT EXISTS discoveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cat_id uuid NOT NULL,
  type text, -- new_collection / level_up / rare_found / insight
  collection_definition_id uuid REFERENCES collection_definitions(id) ON DELETE CASCADE,
  title text,
  body text,
  photo_id uuid REFERENCES photos(id) ON DELETE SET NULL,
  payload jsonb,
  is_read boolean default false,
  created_at timestamptz DEFAULT now()
);

-- RLS Settings (Basic defaults to allow authenticated read/write for now)
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE photo_cat_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE photo_analysis_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE photo_analysis_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE cat_collection_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE cat_collection_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE discoveries ENABLE ROW LEVEL SECURITY;

-- Note: In production, policies should verify household_id and user_id.
-- For MVP testing, allow public/authenticated access logic will be handled via API layer or specific policies.
-- Create simple policies allowing all authenticated users (since demo mode uses generic auth for now)
CREATE POLICY "Enable all for authenticated users" ON photos FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for authenticated users" ON photo_cat_links FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for authenticated users" ON photo_analysis_jobs FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for authenticated users" ON photo_analysis_results FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for authenticated users" ON collection_definitions FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for authenticated users" ON collection_rules FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for authenticated users" ON cat_collection_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for authenticated users" ON cat_collection_photos FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for authenticated users" ON discoveries FOR ALL TO authenticated USING (true) WITH CHECK (true);
