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

async function prepareMove() {
    console.log('Listing all files in avatars/incidents/...');
    const { data: files, error } = await supabase.storage
        .from('avatars')
        .list('incidents', { limit: 100 });

    if (error) {
        console.error('Error:', error.message);
        return;
    }

    console.log(`Found ${files.length} files in avatars/incidents/.`);
    files.forEach(f => {
        console.log(`- ${f.name}`);
    });

    if (files.length > 0) {
        console.log('\nSuggested action: Move these files to cat-images/incidents/');
    }
}

prepareMove();
