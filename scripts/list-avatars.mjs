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

async function listAvatars() {
    console.log('Listing files in avatars bucket...');

    // Check root
    const { data: files, error } = await supabase.storage
        .from('avatars')
        .list('', { limit: 10 });

    if (error) {
        console.error('Error listing avatars:', error.message);
    } else {
        console.log('Files in avatars/ (root):');
        files.forEach(f => console.log(`- ${f.name} (isDir: ${f.id === null})`));
    }

    // Check incidents folder (if it exists)
    const { data: ifiles, error: ierr } = await supabase.storage
        .from('avatars')
        .list('incidents', { limit: 10 });

    if (!ierr) {
        console.log('Files in avatars/incidents/:');
        ifiles.forEach(f => console.log(`- ${f.name}`));
    }
}

listAvatars();
