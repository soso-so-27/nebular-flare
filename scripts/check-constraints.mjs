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

async function checkConstraints() {
    console.log('Checking cat_images unique constraints/indexes...');

    // Attempt a simple query to see if there are any obvious duplicates or if we can get index info
    // Since we can't easily query information_schema without a proper RPC, let's try to add the constraint and see if it fails (using a script)

    const { data, error } = await supabase.rpc('get_table_columns_info', { t_name: 'cat_images' });
    if (error) {
        console.log('RPC get_table_columns_info failed. Trying alternative...');
    } else {
        console.log('Columns:', data);
    }

    // Check for duplicates in storage_path
    const { data: dupes, error: dupeError } = await supabase.from('cat_images').select('storage_path').limit(10);
    if (dupeError) {
        console.error('Error fetching data:', dupeError.message);
    } else {
        console.log('Sample storage_paths:', dupes.map(d => d.storage_path));
    }
}

checkConstraints();
