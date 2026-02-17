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

async function listFiles() {
    console.log('Listing files in cat-images bucket...');

    // Check incidents folder
    const { data: files, error } = await supabase.storage
        .from('cat-images')
        .list('incidents', { limit: 10 });

    if (error) {
        console.error('Error listing incidents:', error.message);
    } else {
        console.log('Files in incidents/:');
        files.forEach(f => console.log(`- ${f.name}`));
    }

    // Check cat-photos folder
    const { data: cfiles, error: cerr } = await supabase.storage
        .from('cat-images')
        .list('cat-photos', { limit: 10 });

    if (cerr) {
        console.error('Error listing cat-photos:', cerr.message);
    } else {
        console.log('Files in cat-photos/:');
        cfiles.forEach(f => console.log(`- ${f.name}`));
    }
}

listFiles();
