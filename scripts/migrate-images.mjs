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

async function migrate() {
    console.log('Fetching files from avatars/incidents/...');
    const { data: files, error } = await supabase.storage
        .from('avatars')
        .list('incidents', { limit: 1000 });

    if (error) {
        console.error('Error listing:', error.message);
        return;
    }

    console.log(`Found ${files.length} files to migrate.`);

    for (const file of files) {
        if (file.id === null) continue; // Skip folders

        const path = `incidents/${file.name}`;
        console.log(`Migrating ${path}...`);

        // 1. Download
        const { data: blob, error: dlError } = await supabase.storage
            .from('avatars')
            .download(path);

        if (dlError) {
            console.error(`  Download failed for ${file.name}:`, dlError.message);
            continue;
        }

        // 2. Upload to cat-images
        const { error: upError } = await supabase.storage
            .from('cat-images')
            .upload(path, blob, { upsert: true });

        if (upError) {
            console.error(`  Upload failed for ${file.name}:`, upError.message);
        } else {
            console.log(`  Success!`);
        }
    }

    console.log('Migration complete.');
}

migrate();
