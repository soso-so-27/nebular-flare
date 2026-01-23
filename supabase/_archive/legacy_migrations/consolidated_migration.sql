-- Consolidated Migration Script for CatUp
-- Run this script to set up all new features (Weights, Family, Photos)

-- 1. Create Households Infrastructure
CREATE TABLE IF NOT EXISTS households (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT DEFAULT 'My Household',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE households ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'households' AND policyname = 'Users can view their own household') THEN
        CREATE POLICY "Users can view their own household" ON households
            FOR SELECT USING (
                id IN (SELECT household_id FROM household_members WHERE user_id = auth.uid())
            );
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'households' AND policyname = 'Users can create households') THEN
        CREATE POLICY "Users can create households" ON households
            FOR INSERT WITH CHECK (true);
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS household_members (
    household_id UUID REFERENCES households(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT CHECK (role IN ('owner', 'member', 'admin')) DEFAULT 'member',
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (household_id, user_id)
);

ALTER TABLE household_members ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'household_members' AND policyname = 'Users can view members of their household') THEN
        CREATE POLICY "Users can view members of their household" ON household_members
            FOR SELECT USING (
                household_id IN (
                    SELECT household_id FROM household_members WHERE user_id = auth.uid()
                )
            );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'household_members' AND policyname = 'Users can join households') THEN
        CREATE POLICY "Users can join households" ON household_members
            FOR INSERT WITH CHECK (user_id = auth.uid());
    END IF;
END $$;

-- 2. Create Household Invites Table
CREATE TABLE IF NOT EXISTS household_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  code VARCHAR(20) NOT NULL UNIQUE,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  used_by UUID REFERENCES auth.users(id),
  used_at TIMESTAMPTZ
);

ALTER TABLE household_invites ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'household_invites' AND policyname = 'Members can view their household invites') THEN
        CREATE POLICY "Members can view their household invites"
        ON household_invites FOR SELECT
        USING (
          EXISTS (
            SELECT 1 FROM household_members hm
            WHERE hm.household_id = household_invites.household_id
            AND hm.user_id = auth.uid()
          )
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'household_invites' AND policyname = 'Members can create household invites') THEN
        CREATE POLICY "Members can create household invites"
        ON household_invites FOR INSERT
        WITH CHECK (
          EXISTS (
            SELECT 1 FROM household_members hm
            WHERE hm.household_id = household_invites.household_id
            AND hm.user_id = auth.uid()
          )
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'household_invites' AND policyname = 'Anyone can lookup invite by code') THEN
        CREATE POLICY "Anyone can lookup invite by code"
        ON household_invites FOR SELECT
        USING (true);
    END IF;
END $$;

-- 3. Create Household Members View
CREATE OR REPLACE VIEW household_members_view AS
SELECT 
  hm.household_id,
  hm.user_id,
  hm.role,
  hm.joined_at,
  u.email,
  u.raw_user_meta_data->>'full_name' as name,
  u.raw_user_meta_data->>'avatar_url' as avatar
FROM household_members hm
JOIN auth.users u ON hm.user_id = u.id;

-- 4. Add Cat Profile Fields (Weight, Microchip, etc.)
ALTER TABLE cats ADD COLUMN IF NOT EXISTS birthday DATE;
ALTER TABLE cats ADD COLUMN IF NOT EXISTS weight NUMERIC(4,2); -- in kg
ALTER TABLE cats ADD COLUMN IF NOT EXISTS microchip_id TEXT;
ALTER TABLE cats ADD COLUMN IF NOT EXISTS notes TEXT;

-- 5. Create Cat Weight History Table
CREATE TABLE IF NOT EXISTS cat_weight_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cat_id UUID NOT NULL REFERENCES cats(id) ON DELETE CASCADE,
    weight NUMERIC(4,2) NOT NULL,
    recorded_at TIMESTAMPTZ DEFAULT NOW(),
    notes TEXT,
    created_by UUID REFERENCES auth.users(id)
);

ALTER TABLE cat_weight_history ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'cat_weight_history' AND policyname = 'Users can view weight history of their cats') THEN
        CREATE POLICY "Users can view weight history of their cats"
            ON cat_weight_history FOR SELECT
            USING (
                EXISTS (
                    SELECT 1 FROM cats c
                    JOIN household_members hm ON c.household_id = hm.household_id
                    WHERE c.id = cat_weight_history.cat_id
                    AND hm.user_id = auth.uid()
                )
            );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'cat_weight_history' AND policyname = 'Users can insert weight history for their cats') THEN
        CREATE POLICY "Users can insert weight history for their cats"
            ON cat_weight_history FOR INSERT
            WITH CHECK (
                EXISTS (
                    SELECT 1 FROM cats c
                    JOIN household_members hm ON c.household_id = hm.household_id
                    WHERE c.id = cat_weight_history.cat_id
                    AND hm.user_id = auth.uid()
                )
            );
    END IF;
END $$;

-- 6. Helper: Auto-create household for existing users without one
DO $$
DECLARE
    u RECORD;
    new_household_id UUID;
BEGIN
    FOR u IN SELECT id FROM auth.users LOOP
        IF NOT EXISTS (SELECT 1 FROM household_members WHERE user_id = u.id) THEN
            INSERT INTO households (name) VALUES ('My Family') RETURNING id INTO new_household_id;
            INSERT INTO household_members (household_id, user_id, role) 
            VALUES (new_household_id, u.id, 'owner');
        END IF;
    END LOOP;
END $$;
