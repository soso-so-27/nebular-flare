-- 1. Create Households Table
CREATE TABLE IF NOT EXISTS households (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT DEFAULT 'My Household',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE households ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own household" ON households
    FOR SELECT USING (
        id IN (SELECT household_id FROM household_members WHERE user_id = auth.uid())
    );

CREATE POLICY "Users can create households" ON households
    FOR INSERT WITH CHECK (true);

-- 2. Create Household Members Table
CREATE TABLE IF NOT EXISTS household_members (
    household_id UUID REFERENCES households(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT CHECK (role IN ('owner', 'member', 'admin')) DEFAULT 'member',
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (household_id, user_id)
);

ALTER TABLE household_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view members of their household" ON household_members
    FOR SELECT USING (
        household_id IN (
            SELECT household_id FROM household_members WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can join households" ON household_members
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- 3. Auto-assign existing users to a new household if they have none (Migration helper)
DO $$
DECLARE
    u RECORD;
    new_household_id UUID;
BEGIN
    FOR u IN SELECT id FROM auth.users LOOP
        -- Check if user is already in a household
        IF NOT EXISTS (SELECT 1 FROM household_members WHERE user_id = u.id) THEN
            -- Create a new household for them
            INSERT INTO households (name) VALUES ('My Family') RETURNING id INTO new_household_id;
            
            -- Add them as owner
            INSERT INTO household_members (household_id, user_id, role) 
            VALUES (new_household_id, u.id, 'owner');
        END IF;
    END LOOP;
END $$;
