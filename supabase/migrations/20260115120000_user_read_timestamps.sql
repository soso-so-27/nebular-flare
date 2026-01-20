-- Add per-user read timestamps to users table
-- This enables proper "unread" counting per user for photos and incidents

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS last_seen_photo_at TIMESTAMPTZ DEFAULT '1970-01-01T00:00:00Z',
ADD COLUMN IF NOT EXISTS last_seen_incident_at TIMESTAMPTZ DEFAULT '1970-01-01T00:00:00Z';

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_users_last_seen ON users(last_seen_photo_at, last_seen_incident_at);
