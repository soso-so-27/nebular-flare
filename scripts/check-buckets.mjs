import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkBucket() {
    const { data: buckets, error } = await supabase.storage.listBuckets();

    if (error) {
        console.error('Error listing buckets:', error.message);
        return;
    }

    const catImages = buckets.find(b => b.name === 'cat-images');
    if (catImages) {
        console.log('--- cat-images bucket settings ---');
        console.log('Public:', catImages.public);
        console.log('Allowed Mime Types:', catImages.allowed_mime_types);
        console.log('Max File Size:', catImages.file_size_limit);
    } else {
        console.error('Bucket "cat-images" not found');
    }

    const avatars = buckets.find(b => b.name === 'avatars');
    if (avatars) {
        console.log('--- avatars bucket settings ---');
        console.log('Public:', avatars.public);
    }
}

checkBucket();
