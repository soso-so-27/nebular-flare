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

async function checkSchema() {
    console.log('Checking cat_images columns...');
    const { data: cols, error } = await supabase.rpc('get_table_columns_info', { t_name: 'cat_images' });

    if (error) {
        // If RPC doesn't exist, try public query if possible (likely not)
        console.error('Error fetching via RPC:', error.message);

        // Alternative: Try to select 1 row and check keys
        const { data, error: selError } = await supabase.from('cat_images').select('*').limit(1).maybeSingle();
        if (selError) {
            console.error('Error fetching sample row from cat_images:', selError.message);

            // Try hyphenated version
            const { data: dataHyphen, error: selErrorHyphen } = await supabase.from('cat-images').select('*').limit(1).maybeSingle();
            if (selErrorHyphen) {
                console.error('Error fetching sample row from cat-images:', selErrorHyphen.message);
            } else {
                console.log('Success! cat-images (hyphen) exists. Columns:', Object.keys(dataHyphen || {}));
            }
        } else {
            console.log('Success! cat_images (underscore) exists. Columns:', Object.keys(data || {}));
        }
        return;
    }
    console.log('Columns:', cols);
}

checkSchema();
