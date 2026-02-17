
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function fix() {
    console.log('Starting sync fix...');
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 1. Add cat_ids column to incidents if missing
    console.log('Checking/adding cat_ids to incidents...');
    const { error: alterError } = await supabase.rpc('execute_sql', {
        sql: `ALTER TABLE public.incidents ADD COLUMN IF NOT EXISTS cat_ids uuid[] DEFAULT '{}';`
    });
    if (alterError) {
        // Fallback: try raw query if RPC fails
        console.error('RPC execute_sql failed, trying direct query is not possible via supabase-js for DDL. Please check if you have the permission.');
        console.error(alterError);
    }

    // 2. Update existing records in incidents
    console.log('Updating existing incidents records...');
    const { error: updateIncError } = await supabase.rpc('execute_sql', {
        sql: `UPDATE public.incidents SET cat_ids = ARRAY[cat_id] WHERE (cat_ids IS NULL OR cardinality(cat_ids) = 0) AND cat_id IS NOT NULL;`
    });
    if (updateIncError) console.error(updateIncError);

    // 3. Update Sync Trigger Function
    console.log('Updating sync trigger function...');
    const { error: triggerError } = await supabase.rpc('execute_sql', {
        sql: `
        CREATE OR REPLACE FUNCTION public.sync_incident_photos_to_gallery()
        RETURNS TRIGGER AS $$
        DECLARE
            photo_path TEXT;
            ai_meta JSONB;
        BEGIN
            IF NEW.photos IS NULL OR array_length(NEW.photos, 1) IS NULL THEN
                RETURN NEW;
            END IF;

            ai_meta := NEW.symptom_details->'ai_analysis';

            FOREACH photo_path IN ARRAY NEW.photos LOOP
                INSERT INTO public.cat_images (
                    cat_id, 
                    cat_ids, 
                    storage_path, 
                    memo, 
                    created_at,
                    ai_analysis,
                    source
                ) VALUES (
                    NEW.cat_id, 
                    COALESCE(NEW.cat_ids, ARRAY[NEW.cat_id]), 
                    photo_path, 
                    NEW.note, 
                    COALESCE(NEW.onset_at, NEW.created_at),
                    ai_meta,
                    'incident'
                )
                ON CONFLICT (storage_path) DO UPDATE SET
                    cat_ids = public.unique_array_merge(cat_images.cat_ids, EXCLUDED.cat_ids),
                    ai_analysis = COALESCE(cat_images.ai_analysis, EXCLUDED.ai_analysis),
                    memo = EXCLUDED.memo,
                    updated_at = NOW();
            END LOOP;

            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql SECURITY DEFINER;
        `
    });
    if (triggerError) console.error(triggerError);

    // 4. Backfill cat_images from incidents
    console.log('Backfilling cat_images...');
    const { error: backfillError } = await supabase.rpc('execute_sql', {
        sql: `
        INSERT INTO public.cat_images (cat_id, cat_ids, storage_path, memo, created_at, ai_analysis, source)
        SELECT 
            i.cat_id, 
            COALESCE(i.cat_ids, ARRAY[i.cat_id]), 
            p, 
            i.note, 
            COALESCE(i.onset_at, i.created_at),
            i.symptom_details->'ai_analysis',
            'incident'
        FROM 
            public.incidents i,
            unnest(i.photos) p
        WHERE 
            p IS NOT NULL 
            AND NOT EXISTS (
                SELECT 1 FROM public.cat_images ci WHERE ci.storage_path = p
            );
        `
    });
    if (backfillError) console.error(backfillError);

    console.log('Sync fix completed.');
}

fix();
