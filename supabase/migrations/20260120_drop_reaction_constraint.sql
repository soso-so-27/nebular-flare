-- Remove the unique constraint that limits one reaction per user per incident
-- This allows "clap" style multiple hearts

ALTER TABLE incident_reactions
DROP CONSTRAINT IF EXISTS incident_reactions_incident_id_user_id_emoji_key;
