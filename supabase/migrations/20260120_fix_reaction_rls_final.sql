-- Migration: Fix RLS for incident_reactions
-- Use a SECURITY DEFINER function to avoid RLS recursion and ensure robust access checks

-- 1. Create a helper function to check incident access
CREATE OR REPLACE FUNCTION check_incident_visibility(p_incident_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM incidents i
        JOIN cats c ON i.cat_id = c.id
        JOIN users u ON c.household_id = u.household_id
        WHERE i.id = p_incident_id
        AND u.id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Update RLS Policies
DROP POLICY IF EXISTS "Users can add own reactions" ON incident_reactions;
DROP POLICY IF EXISTS "Users can view household incident reactions" ON incident_reactions;

CREATE POLICY "Users can view household incident reactions" ON incident_reactions
    FOR SELECT USING (check_incident_visibility(incident_id));

CREATE POLICY "Users can add own reactions" ON incident_reactions
    FOR INSERT WITH CHECK (
        user_id = auth.uid() 
        AND check_incident_visibility(incident_id)
    );
