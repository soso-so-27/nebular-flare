import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY; // Using anon key to simulate client

const supabase = createClient(supabaseUrl, supabaseKey);

const getFullImageUrl = (path) => {
    if (!path) return '';
    if (path.startsWith('http')) return path;

    // Determine bucket
    let bucket = 'avatars';
    const catImagePrefixes = ['cat-photos', 'cat-videos', 'incident_updates', 'incidents', 'incoming'];
    if (catImagePrefixes.some(p => path.includes(p))) {
        bucket = 'cat-images';
    }

    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
};

const paths = [
    'incidents/1770904490519-2l0fv.JPG', // Feb 12
    'incidents/1770717295277-xuc652.jpeg', // Feb 10
    'cat-photos/test.jpg'
];

paths.forEach(p => {
    console.log(`Path: ${p} -> URL: ${getFullImageUrl(p)}`);
});
