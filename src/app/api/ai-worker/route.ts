import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

const MAX_BATCH_SIZE = 10;
const MAX_ATTEMPTS = 3;

type AnalysisJob = {
    id: string;
    photo_id: string;
    status: string;
    attempt_count: number | null;
    photos: {
        storage_path: string;
    } | null;
};

function buildSystemPrompt() {
    return `You are a professional cat photographer and behaviorist.
Analyze this photo and strictly return a JSON object with the following schema:
{
  "cats_detected": number,
  "is_cat_primary_subject": boolean,
  "pose_tags": string[],
  "action_tags": string[],
  "place_tags": string[],
  "mood_tags": string[],
  "object_tags": string[],
  "scene_summary": string,
  "quality_score": number
}

Output only valid JSON.`;
}

async function markJobFailed(supabase: ReturnType<typeof createClient>, job: AnalysisJob, errorMessage: string) {
    const nextAttemptCount = (job.attempt_count ?? 0) + 1;

    await supabase
        .from('photo_analysis_jobs')
        .update({
            status: 'failed',
            attempt_count: nextAttemptCount,
            error_message: errorMessage,
            finished_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        })
        .eq('id', job.id);
}

async function processJob(
    supabase: ReturnType<typeof createClient>,
    openai: OpenAI,
    job: AnalysisJob
) {
    await supabase
        .from('photo_analysis_jobs')
        .update({
            status: 'running',
            started_at: new Date().toISOString(),
            error_message: null,
            updated_at: new Date().toISOString(),
        })
        .eq('id', job.id);

    const photo = job.photos;
    if (!photo?.storage_path) {
        throw new Error('Linked photo not found');
    }

    const { data: urlData } = supabase.storage.from('cat-images').getPublicUrl(photo.storage_path);
    const imageUrl = urlData.publicUrl;

    const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
            {
                role: 'system',
                content: buildSystemPrompt(),
            },
            {
                role: 'user',
                content: [
                    { type: 'text', text: 'Analyze this image and return JSON.' },
                    {
                        type: 'image_url',
                        image_url: { url: imageUrl, detail: 'low' },
                    },
                ],
            },
        ],
        response_format: { type: 'json_object' },
        max_tokens: 500,
        temperature: 0.2,
    });

    const rawContent = response.choices[0]?.message?.content || '{}';
    let parsedJson: Record<string, any>;

    try {
        parsedJson = JSON.parse(rawContent);
    } catch {
        throw new Error('Failed to parse OpenAI JSON response');
    }

    const { error: resultError } = await supabase
        .from('photo_analysis_results')
        .upsert(
            {
                photo_id: job.photo_id,
                raw_json: parsedJson,
                pose_tags: parsedJson.pose_tags || [],
                action_tags: parsedJson.action_tags || [],
                place_tags: parsedJson.place_tags || [],
                mood_tags: parsedJson.mood_tags || [],
                object_tags: parsedJson.object_tags || [],
                scene_summary: parsedJson.scene_summary || '',
                quality_score: parsedJson.quality_score || 0.8,
                confidence: 0.95,
                updated_at: new Date().toISOString(),
            },
            { onConflict: 'photo_id' }
        );

    if (resultError) {
        throw resultError;
    }

    await supabase
        .from('photo_analysis_jobs')
        .update({
            status: 'completed',
            finished_at: new Date().toISOString(),
            error_message: null,
            updated_at: new Date().toISOString(),
        })
        .eq('id', job.id);

    return parsedJson;
}

export async function POST(req: NextRequest) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;

    if (!supabaseUrl || !supabaseKey) {
        return NextResponse.json({ error: 'Supabase configuration error' }, { status: 500 });
    }

    if (!openaiKey) {
        return NextResponse.json({ error: 'OpenAI API key is missing' }, { status: 500 });
    }

    const authHeader = req.headers.get('Authorization') || '';
    const supabase = createClient(supabaseUrl, supabaseKey, {
        global: { headers: { Authorization: authHeader } },
    });

    const openai = new OpenAI({ apiKey: openaiKey });

    try {
        const { data: jobs, error: jobError } = await supabase
            .from('photo_analysis_jobs')
            .select('id, photo_id, status, attempt_count, photos(storage_path)')
            .eq('status', 'queued')
            .lt('attempt_count', MAX_ATTEMPTS)
            .order('requested_at', { ascending: true })
            .limit(MAX_BATCH_SIZE);

        if (jobError) {
            throw jobError;
        }

        if (!jobs || jobs.length === 0) {
            return NextResponse.json({ message: 'No queued jobs found', processed: 0 });
        }

        const succeededPhotoIds: string[] = [];
        const failures: Array<{ job_id: string; error: string }> = [];
        let skipped = 0;

        for (const job of jobs as AnalysisJob[]) {
            if ((job.attempt_count ?? 0) >= MAX_ATTEMPTS) {
                skipped += 1;
                continue;
            }

            try {
                await processJob(supabase, openai, job);
                succeededPhotoIds.push(job.photo_id);
            } catch (error: any) {
                const message = error?.message || 'Unknown worker error';
                await markJobFailed(supabase, job, message);
                failures.push({ job_id: job.id, error: message });
            }
        }

        if (succeededPhotoIds.length > 0) {
            const aggregateUrl = new URL('/api/collection/aggregate', req.url).toString();

            await Promise.allSettled(
                succeededPhotoIds.map((photoId) =>
                    fetch(aggregateUrl, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            Authorization: authHeader,
                        },
                        body: JSON.stringify({ photo_id: photoId }),
                    })
                )
            );
        }

        return NextResponse.json({
            status: 'success',
            processed: jobs.length,
            completed: succeededPhotoIds.length,
            failed: failures.length,
            skipped,
            photo_ids: succeededPhotoIds,
            failures,
        });
    } catch (error: any) {
        console.error('[AI Worker API] Error:', error);
        return NextResponse.json(
            { error: 'Worker failed', details: error?.message || 'Unknown worker error' },
            { status: 500 }
        );
    }
}
