import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkLatest() {
    // 1. Get a valid household_id
    const { data: households, error: hError } = await supabase
        .from('households')
        .select('id')
        .limit(1);

    if (hError || !households || households.length === 0) {
        console.error('Error fetching household:', hError);
        return;
    }

    const householdId = households[0].id;
    console.log('Checking for household:', householdId);

    // 2. Fetch incidents for this household
    const { data, error } = await supabase
        .from('incidents')
        .select('id, note, photos, created_at')
        .eq('household_id', householdId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(1);

    if (error) {
        console.error('Error fetching latest incident:', error);
        return;
    }

    if (!data || data.length === 0) {
        console.log('No incidents found for this household.');
        return;
    }

    const latest = data[0];
    console.log('Latest Incident:');
    console.log('ID:', latest.id);
    console.log('Note:', latest.note);
    console.log('Created At:', latest.created_at);
    console.log('Photos:', latest.photos);
    console.log('Has Photos:', latest.photos && latest.photos.length > 0);
}

checkLatest();
