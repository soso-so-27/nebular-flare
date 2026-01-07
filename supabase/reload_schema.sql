-- Force reload of PostgREST schema cache to recognize new columns
NOTIFY pgrst, 'reload schema';

-- Verify that columns are returned in JSON format (bypasses potential client-side type issues)
SELECT row_to_json(t) 
FROM (
  SELECT id, name, background_mode, background_media 
  FROM cats 
  LIMIT 1
) t;
