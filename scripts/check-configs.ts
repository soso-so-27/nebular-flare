
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function check() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !key) {
        fs.writeFileSync('configs_debug.txt', "Missing env vars in .env.local");
        return;
    }

    const supabase = createClient(url, key);
    try {
        const { data, error } = await supabase.from('configurations').select('*');
        if (error) {
            fs.writeFileSync('configs_debug.txt', `Error: ${error.message}`);
        } else {
            fs.writeFileSync('configs_debug.txt', JSON.stringify(data, null, 2));
        }
    } catch (e) {
        fs.writeFileSync('configs_debug.txt', `Catch Error: ${(e as Error).message}`);
    }
}

check().then(() => console.log("Done checking"));
