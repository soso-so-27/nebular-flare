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

async function checkFeb15() {
    console.log('Checking incidents for Feb 15...');
    const { data: incs, error: e1 } = await supabase
        .from('incidents')
        .select('*')
        .gte('created_at', '2026-02-15T00:00:00Z')
        .lte('created_at', '2026-02-15T23:59:59Z');

    console.log(`Found ${incs?.length || 0} incidents.`);
    incs?.forEach(i => console.log(`Inc ${i.id}: photos=${i.photos}`));

    console.log('Checking cat_images for Feb 15...');
    const { data: imgs, error: e2 } = await supabase
        .from('cat_images')
        .select('*')
        .gte('created_at', '2026-02-15T00:00:00Z')
        .lte('created_at', '2026-02-15T23:59:59Z');

    console.log(`Found ${imgs?.length || 0} cat_images.`);
    imgs?.forEach(i => console.log(`Img ${i.id}: path=${i.storage_path}`));
}

checkFeb15();
