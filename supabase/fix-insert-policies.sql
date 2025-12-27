-- Fix INSERT policies for care_logs and observations
-- Run this in Supabase SQL Editor

-- Drop existing policies if they cause issues
DROP POLICY IF EXISTS "Users can access household care_logs" ON care_logs;
DROP POLICY IF EXISTS "Users can access cat observations" ON observations;

-- care_logs: SELECT policy
CREATE POLICY "Users can view household care_logs" ON care_logs
    FOR SELECT USING (household_id IN (
        SELECT household_id FROM users WHERE id = auth.uid()
    ));

-- care_logs: INSERT policy
CREATE POLICY "Users can insert household care_logs" ON care_logs
    FOR INSERT WITH CHECK (household_id IN (
        SELECT household_id FROM users WHERE id = auth.uid()
    ));

-- care_logs: UPDATE policy
CREATE POLICY "Users can update household care_logs" ON care_logs
    FOR UPDATE USING (household_id IN (
        SELECT household_id FROM users WHERE id = auth.uid()
    ));

-- observations: SELECT policy  
CREATE POLICY "Users can view cat observations" ON observations
    FOR SELECT USING (cat_id IN (
        SELECT id FROM cats WHERE household_id IN (
            SELECT household_id FROM users WHERE id = auth.uid()
        )
    ));

-- observations: INSERT policy
CREATE POLICY "Users can insert cat observations" ON observations
    FOR INSERT WITH CHECK (cat_id IN (
        SELECT id FROM cats WHERE household_id IN (
            SELECT household_id FROM users WHERE id = auth.uid()
        )
    ));

-- observations: UPDATE policy
CREATE POLICY "Users can update cat observations" ON observations
    FOR UPDATE USING (cat_id IN (
        SELECT id FROM cats WHERE household_id IN (
            SELECT household_id FROM users WHERE id = auth.uid()
        )
    ));

-- cats: INSERT policy (for adding new cats)
DROP POLICY IF EXISTS "Users can access household cats" ON cats;

CREATE POLICY "Users can view household cats" ON cats
    FOR SELECT USING (household_id IN (
        SELECT household_id FROM users WHERE id = auth.uid()
    ));

CREATE POLICY "Users can insert household cats" ON cats
    FOR INSERT WITH CHECK (household_id IN (
        SELECT household_id FROM users WHERE id = auth.uid()
    ));

CREATE POLICY "Users can update household cats" ON cats
    FOR UPDATE USING (household_id IN (
        SELECT household_id FROM users WHERE id = auth.uid()
    ));
