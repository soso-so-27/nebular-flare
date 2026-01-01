-- Ensure users table exists and matches requirements
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
    household_id UUID REFERENCES households(id), -- Nullable for now, as we use household_members
    display_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own profile" ON users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE USING (auth.uid() = id);

-- Allow viewing other household members (needed for logs if we were using public.users directly for that)
-- But mostly we use RPC now. Still good to have.
CREATE POLICY "Users can view members of their household" ON users
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM household_members hm_me
            JOIN household_members hm_target ON hm_me.household_id = hm_target.household_id
            WHERE hm_me.user_id = auth.uid() AND hm_target.user_id = users.id
        )
    );

-- Fix foreign keys references if needed? 
-- care_logs references users(id). Ensure that holds.
