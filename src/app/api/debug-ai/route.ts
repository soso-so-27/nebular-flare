import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(req: NextRequest) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
        return NextResponse.json({
            error: 'Missing env vars',
            hasUrl: !!url,
            hasKey: !!key,
            env: process.env // careful debugging
        }, { status: 200 });
    }

    try {
        const supabase = createClient(url, key);
        const { data, error } = await supabase.from('cat_images').select('count', { count: 'exact', head: true });

        if (error) return NextResponse.json({ error: error.message, stage: 'connection' }, { status: 200 });

        // If connection        // Check recent photos
        const { data: images, error: queryError } = await supabase
            .from('cat_images')
            .select(`
                *,
                cat_id,
                cats ( name )
            `)
            .order('created_at', { ascending: false })
            .limit(20);

        if (queryError) return NextResponse.json({ error: queryError.message, stage: 'query' }, { status: 200 });

        // Check RPC return structure with valid data
        let rpcResult = null;
        let rpcErrorMsg = null;
        let debugInfo = "";

        if (images && images.length > 0) {
            // Get cat_id from a recent photo
            // We need to fetch the cat_id from the image first (it's not in the select above? wait check schema)
            // schema says cat_id exists.

            const targetImg = images[0];
            // We need to fetch the cat's household_id
            // Let's just quick query
            const { data: cat } = await supabase.from('cat_images').select('cat_id, cats(household_id)').eq('id', targetImg.id).single();

            if (cat && cat.cats) {
                const householdId = (cat.cats as any).household_id;
                debugInfo = `Testing with HHID: ${householdId}`;

                const { data: rpcData, error: rpcErr } = await supabase.rpc('get_cats_with_details', {
                    target_household_id: householdId
                });

                if (rpcErr) {
                    rpcErrorMsg = rpcErr.message;
                } else {
                    // Check the first cat's images
                    if (rpcData && rpcData.length > 0) {
                        const cat = rpcData[0];
                        // Sum up unanalyzed across all cats
                        const totalUnanalyzed = rpcData.reduce((sum: number, c: any) => {
                            return sum + (c.images?.filter((img: any) => !img.ai_analysis).length || 0);
                        }, 0);

                        rpcResult = {
                            catName: cat.name,
                            totalCats: rpcData.length,
                            imageCount: cat.images?.length,
                            firstImageKeys: cat.images?.[0] ? Object.keys(cat.images[0]) : [],
                            sampleImage: cat.images?.[0],
                            foundUnanalyzed: totalUnanalyzed,
                            // Debug: how many null cat_id in raw query?
                            rawNullCatIds: images?.filter((i: any) => i.cat_id === null || i.cat_id === undefined).length,
                            rawTotal: images?.length
                        };
                    }
                }
            } else {
                debugInfo = "Could not find cat/household for recent image";
            }
        }

        // Check for missing incident photos (Full Recovery Check)
        const { data: allIncidents, error: incError } = await supabase
            .from('incidents')
            .select('id, cat_id, photos, created_at, note');

        const missingInGallery: any[] = [];
        if (allIncidents) {
            for (const inc of allIncidents) {
                if (!inc.photos || inc.photos.length === 0) continue;

                for (const path of inc.photos) {
                    const { data: exists } = await supabase
                        .from('cat_images')
                        .select('id')
                        .eq('storage_path', path)
                        .maybeSingle();

                    if (!exists) {
                        missingInGallery.push({
                            incidentId: inc.id,
                            catId: inc.cat_id,
                            path,
                            note: inc.note,
                            createdAt: inc.created_at
                        });
                    }
                }
            }
        }

        // Also check if any cat_images have NULL cat_id
        const { count: nullCatImagesCount } = await supabase
            .from('cat_images')
            .select('*', { count: 'exact', head: true })
            .is('cat_id', null);

        // 5. Inspect cats table
        const { data: catsTable } = await supabase.from('cats').select('*');

        return NextResponse.json({
            status: 'ok',
            debugInfo,
            catsTable,
            catRpcResult: rpcResult,
            rpcError: rpcErrorMsg,
            recentPhotos: images?.map((img: any) => ({
                id: img.id,
                catId: img.cat_id,
                catName: img.cats?.name || 'UNKNOWN',
                hasAnalysis: !!img.ai_analysis,
                analysisContent: img.ai_analysis,
                storagePath: img.storage_path
            })),
            missingGalleryPhotos: missingInGallery,
            nullCatImagesCount,
            incidentsError: incError?.message
        });
    } catch (e: any) {
        return NextResponse.json({ error: 'Unexpected error', details: e.message || String(e) }, { status: 200 });
    }
}
