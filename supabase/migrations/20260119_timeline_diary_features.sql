-- Migration: Add reactions and bookmark support for timeline diary features
-- Phase 1: Reactions
-- Phase 3: Bookmark
-- Phase 4: Filter support (health category)

-- =====================================================
-- Phase 1: Reactions Table
-- =====================================================
CREATE TABLE IF NOT EXISTS incident_reactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    emoji TEXT NOT NULL CHECK (emoji IN ('🐾', '❤️', '😂', '😮', '🏥', '✅')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(incident_id, user_id, emoji)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_incident_reactions_incident ON incident_reactions(incident_id);
CREATE INDEX IF NOT EXISTS idx_incident_reactions_user ON incident_reactions(user_id);

-- RLS for reactions
ALTER TABLE incident_reactions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view reactions for incidents in their household
CREATE POLICY "Users can view household incident reactions" ON incident_reactions
    FOR SELECT USING (
        incident_id IN (
            SELECT i.id FROM incidents i
            JOIN cats c ON i.cat_id = c.id
            WHERE c.household_id IN (
                SELECT household_id FROM users WHERE id = auth.uid()
            )
        )
    );

-- Policy: Users can add their own reactions
CREATE POLICY "Users can add own reactions" ON incident_reactions
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- Policy: Users can delete their own reactions
CREATE POLICY "Users can delete own reactions" ON incident_reactions
    FOR DELETE USING (user_id = auth.uid());

-- =====================================================
-- Phase 3: Bookmark column
-- =====================================================
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS is_bookmarked BOOLEAN DEFAULT FALSE;

-- Index for filtering bookmarked items
CREATE INDEX IF NOT EXISTS idx_incidents_bookmarked ON incidents(is_bookmarked) WHERE is_bookmarked = TRUE;

-- =====================================================
-- Phase 4: Health category support (optional additional filtering)
-- =====================================================
-- Already have 'type' column for filtering (daily, worried, chat, etc.)
-- Add health_category for more detailed health tracking
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS health_category TEXT;
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS health_value TEXT;

-- Index for health filtering
CREATE INDEX IF NOT EXISTS idx_incidents_health_category ON incidents(health_category) WHERE health_category IS NOT NULL;

-- =====================================================
-- Verification
-- =====================================================
-- SELECT 'incident_reactions table created' WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'incident_reactions');
-- SELECT 'is_bookmarked column added' WHERE EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'incidents' AND column_name = 'is_bookmarked');
