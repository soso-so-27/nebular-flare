
import { createClient } from '@supabase/supabase-js';
import { startOfWeek } from 'date-fns';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function verify() {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
    console.log('Week Start (Local):', weekStart.toISOString());

    // 1. cat_images
    const { data: ci, error: cie } = await supabase
        .from('cat_images')
        .select('id, created_at')
        .gte('created_at', weekStart.toISOString());

    // 2. care_logs
    const { data: cl, error: cle } = await supabase
        .from('care_logs')
        .select('id, done_at, images')
        .gte('done_at', weekStart.toISOString());

    // 3. observations
    const { data: ob, error: obe } = await supabase
        .from('observations')
        .select('id, recorded_at, images')
        .gte('recorded_at', weekStart.toISOString());

    console.log(`- cat_images: ${ci?.length || 0}`);
    console.log(`- care_logs: ${cl?.length || 0}`);
    console.log(`- observations: ${ob?.length || 0}`);

    if (cl) {
        cl.forEach(l => {
            if (l.images && l.images.length > 0) {
                console.log(`  CareLog ${l.id} has ${l.images.length} images at ${l.done_at}`);
            }
        });
    }
    if (ob) {
        ob.forEach(o => {
            if (o.images && o.images.length > 0) {
                console.log(`  Observation ${o.id} has ${o.images.length} images at ${o.recorded_at}`);
            }
        });
    }
}

verify();
