-- Create Incidents Table
CREATE TABLE IF NOT EXISTS public.incidents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
    cat_id UUID NOT NULL REFERENCES public.cats(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- 'vomit', 'injury', etc.
    status TEXT NOT NULL DEFAULT 'watching', -- 'watching', 'hospital', 'resolved'
    severity TEXT NOT NULL DEFAULT 'medium', -- 'low', 'medium', 'high'
    photos TEXT[] DEFAULT ARRAY[]::TEXT[],
    note TEXT,
    created_by UUID REFERENCES public.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ
);

-- Create Incident Updates Table (Timeline)
CREATE TABLE IF NOT EXISTS public.incident_updates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    incident_id UUID NOT NULL REFERENCES public.incidents(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id),
    note TEXT,
    photos TEXT[] DEFAULT ARRAY[]::TEXT[],
    status_change TEXT, -- 'improved', 'worsened', 'resolved', or NULL
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incident_updates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Incidents
CREATE POLICY "Households members can view incidents" ON public.incidents
    FOR SELECT
    USING (
        household_id IN (
            SELECT household_id FROM public.household_members 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Households members can insert incidents" ON public.incidents
    FOR INSERT
    WITH CHECK (
        household_id IN (
            SELECT household_id FROM public.household_members 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Households members can update incidents" ON public.incidents
    FOR UPDATE
    USING (
        household_id IN (
            SELECT household_id FROM public.household_members 
            WHERE user_id = auth.uid()
        )
    );

-- RLS Policies for Incident Updates
CREATE POLICY "Households members can view incident_updates" ON public.incident_updates
    FOR SELECT
    USING (
        incident_id IN (
            SELECT id FROM public.incidents
            WHERE household_id IN (
                SELECT household_id FROM public.household_members 
                WHERE user_id = auth.uid()
            )
        )
    );

CREATE POLICY "Households members can insert incident_updates" ON public.incident_updates
    FOR INSERT
    WITH CHECK (
        incident_id IN (
            SELECT id FROM public.incidents
            WHERE household_id IN (
                SELECT household_id FROM public.household_members 
                WHERE user_id = auth.uid()
            )
        )
    );

-- Enable Realtime for these tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.incidents;
ALTER PUBLICATION supabase_realtime ADD TABLE public.incident_updates;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_incidents_household_id ON public.incidents(household_id);
CREATE INDEX IF NOT EXISTS idx_incidents_cat_id ON public.incidents(cat_id);
CREATE INDEX IF NOT EXISTS idx_incident_updates_incident_id ON public.incident_updates(incident_id);
