-- Diagnostics: Notification System Audit (Vol. 22) - FIXED SCHEMA

-- 1. Create a logging table to catch Edge Function errors internally
-- This is the MOST IMPORTANT PART for our audit
CREATE TABLE IF NOT EXISTS public.notification_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now(),
    event_type TEXT, -- 'TEST', 'RECEPTION', 'FCM_SEND', 'ERROR'
    payload JSONB,
    status_code INTEGER,
    message TEXT,
    error_details JSONB
);

-- Allow the service role to write logs
ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service Role can do everything" ON public.notification_logs;
CREATE POLICY "Service Role can do everything" ON public.notification_logs
    USING (auth.jwt() ->> 'role' = 'service_role');

-- 2. Ensure push_tokens table is robust
CREATE TABLE IF NOT EXISTS public.push_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    token TEXT UNIQUE NOT NULL,
    device_info JSONB,
    last_used_at TIMESTAMPTZ DEFAULT now()
);

-- RLS for push_tokens
ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    CREATE POLICY "Users can manage their own tokens" ON public.push_tokens
        FOR ALL USING (auth.uid() = user_id);
EXCEPTION WHEN others THEN NULL; END $$;

-- 3. Diagnostic View for token health (Simplified to avoid schema errors)
CREATE OR REPLACE VIEW public.vw_notification_health AS
SELECT 
    u.id as user_id,
    u.display_name,
    COUNT(pt.id) as token_count,
    u.notification_preferences
FROM public.users u
LEFT JOIN public.push_tokens pt ON u.id = pt.user_id
GROUP BY u.id, u.display_name, u.notification_preferences;

COMMENT ON TABLE public.notification_logs IS 'Server-side logs for notification debugging (Vol. 22)';
