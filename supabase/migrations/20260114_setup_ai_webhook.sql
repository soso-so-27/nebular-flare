-- Migration: Setup AI Tagging Webhook
-- This trigger automatically calls the AI analysis function when a new image is uploaded.

-- 1. Create the RPC function that invokes the Edge Function
CREATE OR REPLACE FUNCTION public.trigger_ai_analysis()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Invoke the analyze-cat-image Edge Function
  -- The payload will be the standard Supabase Webhook format: { "record": { ... }, "type": "INSERT", ... }
  -- Note: We need to pass the service role key for it to work as a webhook if needed, 
  -- but usually Supabase Webhooks handle this via the UI/Config.
  -- Here we are doing it via SQL for transparency and reproducibility.
  
  PERFORM
    net.http_post(
      url := (SELECT value FROM (SELECT COALESCE(
                (SELECT value FROM configurations WHERE key = 'edge_function_base_url'),
                'https://zfuuzgazbdzyclwnqkqm.supabase.co/functions/v1'
              )) as t) || '/analyze-cat-image',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (SELECT value FROM (SELECT COALESCE(
          (SELECT value FROM configurations WHERE key = 'supabase_service_role_key'),
          'YOUR_SERVICE_ROLE_KEY_OR_SECRET' -- Usually set as a secret in DB
        )) as t)
      ),
      body := jsonb_build_object(
        'record', row_to_json(NEW),
        'type', 'INSERT',
        'table', 'cat_images'
      )
    );

  RETURN NEW;
END;
$$;

-- Note: Instead of complex net.http_post in SQL (which requires pg_net extension),
-- the PREFERRED way in Supabase is using the "Database Webhooks" feature in the dashboard.
-- However, for the user to copy-paste, we'll suggest using the dashboard, 
-- but I will provide the Edge Function fix first.

-- [ACTION] 
-- 以下の設定を Supabase Dashboard > Database > Webhooks で行ってください：
-- Name: ai-tagging
-- Table: cat_images
-- Events: Insert
-- Type: Edge Function (analyze-cat-image)
