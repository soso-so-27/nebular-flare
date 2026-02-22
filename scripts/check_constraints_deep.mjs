import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkConstraints() {
    console.log('Checking constraints for incidents table...');

    const { data, error } = await supabase.rpc('get_table_constraints', { table_name_param: 'incidents' });

    if (error) {
        // If RPC doesn't exist, try raw query if possible (likely won't work with anon key)
        console.error('RPC failed or not found:', error.message);

        console.log('Trying to insert a test record with "log" status to verify...');
        const { error: insertError } = await supabase.from('incidents').insert({
            status: 'log',
            type: 'other',
            household_id: '00000000-0000-0000-0000-000000000000', // Dummy
            cat_id: '00000000-0000-0000-0000-000000000000' // Dummy
        });

        if (insertError) {
            console.log('Insert with "log" FAILED:', insertError.code, insertError.message);
        } else {
            console.log('Insert with "log" SUCCEEDED (or ignored due to RLS/Missing ID)');
        }
    } else {
        console.log('Constraints:', data);
    }
}

checkConstraints();
