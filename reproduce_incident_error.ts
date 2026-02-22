import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''; // Use service key for bypass RLS

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testInsert() {
    console.log('Testing Incident Insert with status="log" and type="daily"...');

    // Get first cat and household
    const { data: cats } = await supabase.from('cats').select('id, household_id').limit(1);
    if (!cats || cats.length === 0) {
        console.error('No cats found');
        return;
    }
    const cat = cats[0];

    const { data, error } = await supabase
        .from('incidents')
        .insert({
            household_id: cat.household_id,
            cat_id: cat.id,
            cat_ids: [cat.id],
            type: 'daily',
            note: 'Test from reproduction script',
            status: 'log',
            photos: [],
            onset_at: new Date().toISOString(),
            symptom_details: { tags: ['test'] }
        })
        .select();

    if (error) {
        console.error('FAILED:', error.code, error.message, error.details);
    } else {
        console.log('SUCCESS:', data);
    }
}

testInsert();
