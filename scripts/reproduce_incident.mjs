import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testInsert() {
    console.log('Testing Incident Insert with status="log" and type="daily"...');

    // Get first cat and household
    const { data: cats, error: catError } = await supabase.from('cats').select('id, household_id').limit(1);
    if (catError || !cats || cats.length === 0) {
        console.error('No cats found or error:', catError);
        return;
    }
    const cat = cats[0];
    console.log(`Using Cat ID: ${cat.id}, Household ID: ${cat.household_id}`);

    const payload = {
        household_id: cat.household_id,
        cat_id: cat.id,
        cat_ids: [cat.id],
        type: 'daily',
        note: 'Test from reproduction script (.mjs)',
        status: 'log',
        photos: [],
        onset_at: new Date().toISOString(),
        symptom_details: { tags: ['test'] }
    };

    console.log('Inserting payload:', JSON.stringify(payload, null, 2));

    const { data, error } = await supabase
        .from('incidents')
        .insert(payload)
        .select();

    if (error) {
        console.error('FAILED:', error.code, error.message);
        if (error.details) console.error('Details:', error.details);
        if (error.hint) console.error('Hint:', error.hint);
    } else {
        console.log('SUCCESS:', data);
    }
}

testInsert();
