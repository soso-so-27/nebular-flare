import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectSchema() {
    console.log('--- cat_images columns ---');
    const { data: cols, error } = await supabase.rpc('get_table_columns', { table_name: 'cat_images' });
    if (error) {
        // Fallback: use a simple query if RPC doesn't exist
        const { data: sample, error: err2 } = await supabase.from('cat_images').select('*').limit(1);
        if (err2) {
            console.error('Error:', err2.message);
        } else {
            console.log('Columns in cat_images:', Object.keys(sample[0] || {}));
        }
    } else {
        console.log(cols);
    }

    console.log('\n--- incidents columns ---');
    const { data: isample, error: ierr } = await supabase.from('incidents').select('*').limit(1);
    if (ierr) {
        console.error('Error:', ierr.message);
    } else {
        console.log('Columns in incidents:', Object.keys(isample[0] || {}));
    }
}

inspectSchema();
