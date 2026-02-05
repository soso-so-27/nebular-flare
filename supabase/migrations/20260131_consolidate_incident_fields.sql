-- Final Consolidation Migration for Incidents Table
-- This migration ensures that all medical fields exist with the correct spelling and types.
-- It handles potential legacy typos (sympton -> symptom) and field name mismatches (onset -> onset_at).

DO $$
BEGIN
    -- 1. Correct any legacy naming for symptom_details
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'incidents' AND column_name = 'sympton_details') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'incidents' AND column_name = 'symptom_details') THEN
            ALTER TABLE incidents RENAME COLUMN sympton_details TO symptom_details;
        ELSE
            -- If both exist, we might want to merge or just drop the typo one.
            -- For safety, we'll just drop the typo one if the correct one already exists.
            ALTER TABLE incidents DROP COLUMN sympton_details;
        END IF;
    END IF;

    -- 2. Correct any legacy naming for onset
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'incidents' AND column_name = 'onset') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'incidents' AND column_name = 'onset_at') THEN
            ALTER TABLE incidents RENAME COLUMN onset TO onset_at;
        ELSE
            ALTER TABLE incidents DROP COLUMN onset;
        END IF;
    END IF;

    -- 3. Ensure all columns exist with correct types
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'incidents' AND column_name = 'symptom_details') THEN
        ALTER TABLE incidents ADD COLUMN symptom_details JSONB;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'incidents' AND column_name = 'onset_at') THEN
        ALTER TABLE incidents ADD COLUMN onset_at TIMESTAMP WITH TIME ZONE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'incidents' AND column_name = 'last_normal_at') THEN
        ALTER TABLE incidents ADD COLUMN last_normal_at TIMESTAMP WITH TIME ZONE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'incidents' AND column_name = 'batch_id') THEN
        ALTER TABLE incidents ADD COLUMN batch_id UUID;
    END IF;

END $$;

-- 4. Re-create indexes for performance
CREATE INDEX IF NOT EXISTS idx_incidents_onset_at ON incidents(onset_at);
CREATE INDEX IF NOT EXISTS idx_incidents_batch_id ON incidents(batch_id);
