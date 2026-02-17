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

async function checkUpdates() {
    console.log('Checking incident_updates in cat-images...');
    const { data: c1 } = await supabase.storage.from('cat-images').list('incident_updates');
    console.log('cat-images/incident_updates:', c1?.length || 0, 'files');

    console.log('Checking incident_updates in avatars...');
    const { data: c2 } = await supabase.storage.from('avatars').list('incident_updates');
    console.log('avatars/incident_updates:', c2?.length || 0, 'files');
}

checkUpdates();
