import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    // Authorization header (user session)
    const authHeader = req.headers.get('Authorization') || '';

    if (!supabaseUrl || !supabaseKey) {
        return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    try {
        const supabase = createClient(supabaseUrl, supabaseKey, {
            global: {
                headers: {
                    Authorization: authHeader
                }
            }
        });

        const body = await req.json();
        const { household_id, cat_id, assets } = body;

        if (!household_id || !assets || !Array.isArray(assets)) {
            return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
        }

        const createdPhotoIds: string[] = [];

        // Insert photos and queue jobs
        for (const asset of assets) {
            // 1. Insert into photos table
            const { data: photoData, error: photoError } = await supabase
                .from('photos')
                .insert({
                    household_id,
                    source: asset.source || 'camera_roll',
                    taken_at: asset.taken_at || new Date().toISOString(),
                    storage_path: asset.storage_path,
                    thumbnail_path: asset.thumbnail_path || null,
                    width: asset.width || null,
                    height: asset.height || null,
                })
                .select('id')
                .single();

            if (photoError) {
                console.error('[Import API] Failed to insert photo:', photoError);
                continue;
            }

            const photoId = photoData.id;
            createdPhotoIds.push(photoId);

            // 1.5 Insert cat link if cat_id provided
            if (cat_id) {
                await supabase.from('photo_cat_links').insert({
                    photo_id: photoId,
                    cat_id: cat_id,
                    is_primary: true
                });
            }

            // 2. Queue AI Analysis Job
            const { error: jobError } = await supabase
                .from('photo_analysis_jobs')
                .insert({
                    photo_id: photoId,
                    status: 'queued'
                });

            if (jobError) {
                console.error(`[Import API] Failed to queue job for photo ${photoId}:`, jobError);
            }
        }

        // Fire-and-forget: Trigger AI Worker in the background
        fetch(new URL('/api/ai-worker', req.url).toString(), {
            method: 'POST',
            headers: {
                Authorization: authHeader
            }
        }).catch(err => console.error('[Import API] Failed to trigger AI Worker:', err));

        return NextResponse.json({
            status: 'accepted',
            message: 'Photos imported and AI jobs queued.',
            created_photo_ids: createdPhotoIds
        }, { status: 202 });

    } catch (e: any) {
        console.error(`[Import API] Error:`, e);
        return NextResponse.json({ error: 'Unexpected error', details: e.message }, { status: 500 });
    }
}
