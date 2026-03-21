import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { ZUKAN_AXES } from '@/lib/zukan-data';

export async function POST(req: NextRequest) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
        return NextResponse.json({ error: 'Supabase configuration error' }, { status: 500 });
    }

    const authHeader = req.headers.get('Authorization') || '';
    const supabase = createClient(supabaseUrl, supabaseKey, {
        global: { headers: { Authorization: authHeader } }
    });

    try {
        const body = await req.json();
        const { photo_id } = body;

        if (!photo_id) {
            return NextResponse.json({ error: 'photo_id is required' }, { status: 400 });
        }

        // 1. Fetch AI results
        const { data: aiResult, error: aiError } = await supabase
            .from('photo_analysis_results')
            .select('*')
            .eq('photo_id', photo_id)
            .single();

        if (aiError || !aiResult) {
            return NextResponse.json({ error: 'AI results not found for this photo' }, { status: 404 });
        }

        // 2. Fetch Cat Link
        const { data: catLink, error: catError } = await supabase
            .from('photo_cat_links')
            .select('cat_id')
            .eq('photo_id', photo_id)
            .single(); // assuming 1 primary cat for now

        if (catError || !catLink) {
            return NextResponse.json({ error: 'Cat not linked to this photo' }, { status: 404 });
        }

        const catId = catLink.cat_id;
        const discoveries: any[] = [];

        // 3. Match against ZUKAN_AXES and Process
        for (const axis of ZUKAN_AXES) {
            // Check tags from AI
            let tagsFromAi: string[] = [];
            if (axis.metaKey === 'pose') tagsFromAi = aiResult.pose_tags || [];
            else if (axis.metaKey === 'action') tagsFromAi = aiResult.action_tags || [];
            else if (axis.metaKey === 'location') tagsFromAi = aiResult.place_tags || [];
            else if (axis.metaKey === 'emotion') tagsFromAi = aiResult.mood_tags || [];

            for (const tag of tagsFromAi) {
                // Find matching item in master data
                const masterItem = axis.items.find(it => it.id === tag || it.label.includes(tag));
                if (!masterItem) continue;

                const slug = `${axis.id}_${masterItem.id}`;

                // Ensure definition exists in DB
                let { data: defData } = await supabase
                    .from('collection_definitions')
                    .select('id')
                    .eq('slug', slug)
                    .single();

                if (!defData) {
                    const { data: newDef } = await supabase
                        .from('collection_definitions')
                        .insert({
                            slug,
                            name: masterItem.label,
                            category: axis.id,
                            description: '',
                            is_active: true
                        })
                        .select('id')
                        .single();
                    if (newDef) defData = newDef;
                }

                if (!defData) continue;
                const defId = defData.id;

                // Add to cat_collection_photos
                await supabase
                    .from('cat_collection_photos')
                    .insert({
                        cat_id: catId,
                        collection_definition_id: defId,
                        photo_id: photo_id,
                        confidence: aiResult.confidence
                    }); // Ignore conflict errors if already exists

                // Update or Insert cat_collection_items
                const { data: existingItem } = await supabase
                    .from('cat_collection_items')
                    .select('id, current_level, photo_count')
                    .eq('cat_id', catId)
                    .eq('collection_definition_id', defId)
                    .single();

                if (existingItem) {
                    // Update
                    await supabase
                        .from('cat_collection_items')
                        .update({
                            photo_count: existingItem.photo_count + 1,
                            latest_photo_id: photo_id,
                            last_detected_at: new Date().toISOString()
                        })
                        .eq('id', existingItem.id);
                } else {
                    // Insert new discovery
                    await supabase
                        .from('cat_collection_items')
                        .insert({
                            cat_id: catId,
                            collection_definition_id: defId,
                            photo_count: 1,
                            latest_photo_id: photo_id,
                            first_detected_at: new Date().toISOString(),
                            last_detected_at: new Date().toISOString(),
                            current_level: 1
                        });

                    // Create Discovery notification
                    const { data: newDiscovery } = await supabase
                        .from('discoveries')
                        .insert({
                            cat_id: catId,
                            type: 'new_collection',
                            collection_definition_id: defId,
                            title: `「${masterItem.label}」を新しく発見しました！`,
                            body: 'コレクションに新しいコレクションが追加されました。',
                            photo_id: photo_id,
                            is_read: false
                        })
                        .select('*')
                        .single();

                    if (newDiscovery) discoveries.push(newDiscovery);
                }
            }
        }

        return NextResponse.json({
            status: 'success',
            message: 'Aggregation completed',
            discoveries
        });

    } catch (e: any) {
        console.error(`[Collection Aggregate API] Error:`, e);
        return NextResponse.json({ error: 'Worker failed', details: e.message }, { status: 500 });
    }
}
