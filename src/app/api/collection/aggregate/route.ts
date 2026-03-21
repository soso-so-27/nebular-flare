import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { ZUKAN_AXES } from '@/lib/zukan-data';

type AnalysisResult = {
    photo_id: string;
    pose_tags?: string[];
    action_tags?: string[];
    place_tags?: string[];
    mood_tags?: string[];
    object_tags?: string[];
    confidence?: number;
};

type CollectionDefinitionRecord = {
    id: string;
    slug?: string | null;
    name?: string | null;
    category?: string | null;
};

type CollectionRuleRecord = {
    collection_definition_id: string;
    rule_json: Record<string, any> | null;
    collection_definitions: CollectionDefinitionRecord | CollectionDefinitionRecord[] | null;
};

function normalizeText(value: string) {
    return value.trim().toLowerCase();
}

function normalizeTags(value: unknown): string[] {
    if (!value) {
        return [];
    }

    if (Array.isArray(value)) {
        return value
            .map((item) => String(item).trim())
            .filter(Boolean);
    }

    return [String(value).trim()].filter(Boolean);
}

function takeRelation<T>(value: T | T[] | null | undefined): T | null {
    if (!value) {
        return null;
    }

    return Array.isArray(value) ? value[0] ?? null : value;
}

function buildTagMap(aiResult: AnalysisResult) {
    return {
        pose: normalizeTags(aiResult.pose_tags),
        action: normalizeTags(aiResult.action_tags),
        location: normalizeTags(aiResult.place_tags),
        place: normalizeTags(aiResult.place_tags),
        emotion: normalizeTags(aiResult.mood_tags),
        mood: normalizeTags(aiResult.mood_tags),
        object: normalizeTags(aiResult.object_tags),
    };
}

function getRuleSourceTags(tagMap: ReturnType<typeof buildTagMap>, rule: Record<string, any>) {
    const categoryKey = normalizeText(
        String(rule.category || rule.meta_key || rule.metaKey || rule.field || '')
    );

    if (categoryKey && tagMap[categoryKey as keyof typeof tagMap]) {
        return tagMap[categoryKey as keyof typeof tagMap];
    }

    const requestedFields = normalizeTags(rule.fields || rule.meta_keys || rule.keys || rule.axes).map(normalizeText);
    if (requestedFields.length > 0) {
        return requestedFields.flatMap((field) => tagMap[field as keyof typeof tagMap] || []);
    }

    return Object.values(tagMap).flat();
}

function ruleMatches(aiResult: AnalysisResult, ruleJson: Record<string, any> | null) {
    if (!ruleJson) {
        return false;
    }

    const tagMap = buildTagMap(aiResult);
    const sourceTags = getRuleSourceTags(tagMap, ruleJson).map(normalizeText);
    const combinedTags = Object.values(tagMap).flat().map(normalizeText);

    const matchAll = normalizeTags(ruleJson.match_all_tags || ruleJson.all_tags);
    if (matchAll.length > 0 && !matchAll.every((tag) => sourceTags.includes(normalizeText(tag)))) {
        return false;
    }

    const matchAny = normalizeTags(
        ruleJson.match_tags || ruleJson.match_any_tags || ruleJson.tags || ruleJson.values
    );
    if (matchAny.length > 0) {
        return matchAny.some((tag) => sourceTags.includes(normalizeText(tag)));
    }

    for (const [field, value] of Object.entries(ruleJson)) {
        if (!(field in tagMap)) {
            continue;
        }

        const expectedTags = normalizeTags(value).map(normalizeText);
        if (expectedTags.length > 0 && expectedTags.some((tag) => (tagMap as any)[field].map(normalizeText).includes(tag))) {
            return true;
        }
    }

    return combinedTags.length > 0 && matchAll.length > 0;
}

async function ensureDefinition(
    supabase: ReturnType<typeof createClient>,
    slug: string,
    name: string,
    category: string
) {
    let { data } = await supabase
        .from('collection_definitions')
        .select('id, slug, name, category')
        .eq('slug', slug)
        .single();

    if (!data) {
        const { data: created } = await supabase
            .from('collection_definitions')
            .insert({
                slug,
                name,
                category,
                description: '',
                is_active: true,
            })
            .select('id, slug, name, category')
            .single();

        data = created ?? null;
    }

    return data as CollectionDefinitionRecord | null;
}

async function applyCollectionMatch(
    supabase: ReturnType<typeof createClient>,
    catId: string,
    photoId: string,
    aiResult: AnalysisResult,
    definition: CollectionDefinitionRecord,
    discoveries: any[]
) {
    await supabase
        .from('cat_collection_photos')
        .upsert(
            {
                cat_id: catId,
                collection_definition_id: definition.id,
                photo_id: photoId,
                confidence: aiResult.confidence ?? 0,
            },
            { onConflict: 'cat_id,collection_definition_id,photo_id' }
        );

    const { data: existingItem } = await supabase
        .from('cat_collection_items')
        .select('id, photo_count')
        .eq('cat_id', catId)
        .eq('collection_definition_id', definition.id)
        .single();

    if (existingItem) {
        await supabase
            .from('cat_collection_items')
            .update({
                photo_count: (existingItem.photo_count ?? 0) + 1,
                latest_photo_id: photoId,
                last_detected_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            })
            .eq('id', existingItem.id);
        return;
    }

    await supabase
        .from('cat_collection_items')
        .insert({
            cat_id: catId,
            collection_definition_id: definition.id,
            photo_count: 1,
            latest_photo_id: photoId,
            first_detected_at: new Date().toISOString(),
            last_detected_at: new Date().toISOString(),
            current_level: 1,
        });

    const { data: newDiscovery } = await supabase
        .from('discoveries')
        .insert({
            cat_id: catId,
            type: 'new_collection',
            collection_definition_id: definition.id,
            title: `${definition.name || 'New collection'} discovered`,
            body: 'A new collection entry was detected from this photo.',
            photo_id: photoId,
            is_read: false,
        })
        .select('*')
        .single();

    if (newDiscovery) {
        discoveries.push(newDiscovery);
    }
}

async function getRuleBasedDefinitions(
    supabase: ReturnType<typeof createClient>,
    aiResult: AnalysisResult
) {
    const { data, error } = await supabase
        .from('collection_rules')
        .select('collection_definition_id, rule_json, collection_definitions(id, slug, name, category)')
        .eq('is_active', true)
        .order('priority', { ascending: false });

    if (error || !data || data.length === 0) {
        return { definitions: [] as CollectionDefinitionRecord[], usedRuleTable: false };
    }

    const matched = new Map<string, CollectionDefinitionRecord>();

    for (const row of data as CollectionRuleRecord[]) {
        if (!ruleMatches(aiResult, row.rule_json)) {
            continue;
        }

        const definition = takeRelation(row.collection_definitions);
        if (definition?.id) {
            matched.set(definition.id, definition);
        }
    }

    return {
        definitions: Array.from(matched.values()),
        usedRuleTable: true,
    };
}

async function getFallbackDefinitions(
    supabase: ReturnType<typeof createClient>,
    aiResult: AnalysisResult
) {
    const definitions: CollectionDefinitionRecord[] = [];

    for (const axis of ZUKAN_AXES) {
        let tags: string[] = [];

        if (axis.metaKey === 'pose') tags = normalizeTags(aiResult.pose_tags);
        else if (axis.metaKey === 'action') tags = normalizeTags(aiResult.action_tags);
        else if (axis.metaKey === 'location') tags = normalizeTags(aiResult.place_tags);
        else if (axis.metaKey === 'emotion') tags = normalizeTags(aiResult.mood_tags);

        for (const tag of tags) {
            const item = axis.items.find(
                (candidate) =>
                    normalizeText(candidate.id) === normalizeText(tag) ||
                    normalizeText(candidate.label).includes(normalizeText(tag))
            );

            if (!item) {
                continue;
            }

            const definition = await ensureDefinition(
                supabase,
                `${axis.id}_${item.id}`,
                item.label,
                axis.id
            );

            if (definition?.id) {
                definitions.push(definition);
            }
        }
    }

    const deduped = new Map<string, CollectionDefinitionRecord>();
    for (const definition of definitions) {
        deduped.set(definition.id, definition);
    }

    return Array.from(deduped.values());
}

export async function POST(req: NextRequest) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
        return NextResponse.json({ error: 'Supabase configuration error' }, { status: 500 });
    }

    const authHeader = req.headers.get('Authorization') || '';
    const supabase = createClient(supabaseUrl, supabaseKey, {
        global: { headers: { Authorization: authHeader } },
    });

    try {
        const body = await req.json();
        const { photo_id: photoId } = body;

        if (!photoId) {
            return NextResponse.json({ error: 'photo_id is required' }, { status: 400 });
        }

        const { data: aiResult, error: aiError } = await supabase
            .from('photo_analysis_results')
            .select('*')
            .eq('photo_id', photoId)
            .single();

        if (aiError || !aiResult) {
            return NextResponse.json({ error: 'AI results not found for this photo' }, { status: 404 });
        }

        const { data: catLink, error: catError } = await supabase
            .from('photo_cat_links')
            .select('cat_id')
            .eq('photo_id', photoId)
            .single();

        if (catError || !catLink) {
            return NextResponse.json({ error: 'Cat not linked to this photo' }, { status: 404 });
        }

        const discoveries: any[] = [];
        const ruleResult = await getRuleBasedDefinitions(supabase, aiResult as AnalysisResult);
        const matchedDefinitions = ruleResult.usedRuleTable
            ? ruleResult.definitions
            : await getFallbackDefinitions(supabase, aiResult as AnalysisResult);

        for (const definition of matchedDefinitions) {
            await applyCollectionMatch(
                supabase,
                catLink.cat_id,
                photoId,
                aiResult as AnalysisResult,
                definition,
                discoveries
            );
        }

        return NextResponse.json({
            status: 'success',
            message: 'Aggregation completed',
            mode: ruleResult.usedRuleTable ? 'collection_rules' : 'zukan_axes_fallback',
            matched_count: matchedDefinitions.length,
            discoveries,
        });
    } catch (error: any) {
        console.error('[Collection Aggregate API] Error:', error);
        return NextResponse.json(
            { error: 'Worker failed', details: error?.message || 'Unknown aggregate error' },
            { status: 500 }
        );
    }
}
