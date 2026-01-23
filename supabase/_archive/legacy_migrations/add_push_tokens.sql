-- Create push_tokens table for FCM tokens
CREATE TABLE IF NOT EXISTS push_tokens (
    token TEXT PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    platform TEXT CHECK (platform IN ('ios', 'android', 'web')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;

-- Policies (Drop first to avoid conflicts on re-run)
DROP POLICY IF EXISTS "Users can insert their own tokens" ON push_tokens;
CREATE POLICY "Users can insert their own tokens" ON push_tokens
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own tokens" ON push_tokens;
CREATE POLICY "Users can update their own tokens" ON push_tokens
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own tokens" ON push_tokens;
CREATE POLICY "Users can delete their own tokens" ON push_tokens
    FOR DELETE USING (auth.uid() = user_id);

-- Allow server (service_role) to read/select tokens for sending notifications
-- No aggressive public read policy needed.
