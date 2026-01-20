import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkUrl() {
    const path = "incidents/1768658602363-r2pj95.jpg";
    const bucket = "avatars"; // Based on use-supabase-data.ts logic

    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    console.log('Public URL for', path, 'in bucket', bucket, ':');
    console.log(data.publicUrl);
}

checkUrl();
