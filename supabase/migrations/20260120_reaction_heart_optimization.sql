-- Migration: Optimize reactions for heart-only multi-press system
-- 1. Remove the unique constraint to allow multiple claps/hearts from the same user
ALTER TABLE incident_reactions DROP CONSTRAINT IF EXISTS incident_reactions_incident_id_user_id_emoji_key;

-- 2. Update the emoji check constraint to include heart (it already does, but let's be sure)
-- We'll allow any emoji for future-proofing, but the UI will restrict it to Heart for now.
ALTER TABLE incident_reactions DROP CONSTRAINT IF EXISTS incident_reactions_emoji_check;

-- 3. Fix/Update RLS Policies
-- Temporarily drop to ensure we can recreate them cleanly
DROP POLICY IF EXISTS "Users can add own reactions" ON incident_reactions;
DROP POLICY IF EXISTS "Users can delete own reactions" ON incident_reactions;
DROP POLICY IF EXISTS "Users can view household incident reactions" ON incident_reactions;

-- Re-create SELECT policy: Members of the same household can see reactions
CREATE POLICY "Users can view household incident reactions" ON incident_reactions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM incidents i
            JOIN cats c ON i.cat_id = c.id
            JOIN users u ON c.household_id = u.household_id
            WHERE i.id = incident_reactions.incident_id
            AND u.id = auth.uid()
        )
    );

-- Re-create INSERT policy: Anyone can add their own reaction IF they can see the incident
CREATE POLICY "Users can add own reactions" ON incident_reactions
    FOR INSERT WITH CHECK (
        user_id = auth.uid() 
        AND EXISTS (
            SELECT 1 FROM incidents i
            JOIN cats c ON i.cat_id = c.id
            JOIN users u ON c.household_id = u.household_id
            WHERE i.id = incident_id
            AND u.id = auth.uid()
        )
    );

-- Re-create DELETE policy: Users can delete their own reactions
CREATE POLICY "Users can delete own reactions" ON incident_reactions
    FOR DELETE USING (user_id = auth.uid());
