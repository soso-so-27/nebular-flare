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

async function inspectIncidents() {
    console.log('Inspecting recent incidents...');
    const { data, error } = await supabase
        .from('incidents')
        .select('id, cat_id, photos, created_at')
        .order('created_at', { ascending: false })
        .limit(20);

    if (error) {
        console.error('Error:', error.message);
        return;
    }

    data.forEach(inc => {
        console.log(`Incident ${inc.id} (${inc.created_at}):`);
        console.log('Photos:', inc.photos);
    });
}

inspectIncidents();
