import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
    console.log('--- Testing (cat_id, week_label) ---');
    const { error } = await supabase
        .from('weekly_album_settings')
        .upsert({
            cat_id: '00000000-0000-0000-0000-000000000000',
            week_label: 'TEST_FINAL',
            layout_type: 'hero3'
        }, { onConflict: 'cat_id,week_label' });

    if (error) {
        console.log(`Error: ${error.code} - ${error.message}`);
    } else {
        console.log('MATCH: Success (or RLS pass)');
    }

    console.log('--- Testing (household_id, cat_id, week_label) ---');
    const { error: error2 } = await supabase
        .from('weekly_album_settings')
        .upsert({
            household_id: '00000000-0000-0000-0000-000000000000',
            cat_id: '00000000-0000-0000-0000-000000000000',
            week_label: 'TEST_FINAL',
            layout_type: 'hero3'
        }, { onConflict: 'household_id,cat_id,week_label' });

    if (error2) {
        console.log(`Error2: ${error2.code} - ${error2.message}`);
    } else {
        console.log('MATCH2: Success (or RLS pass)');
    }
}

check();
