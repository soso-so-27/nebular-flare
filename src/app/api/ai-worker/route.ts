import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

// This acts as a background worker endpoint
export async function POST(req: NextRequest) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    // Ideally use SERVICE_ROLE_KEY to bypass RLS, but for MVP we use anon key + auth header if passed, or just force RLS to allow inserted roles
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;

    if (!supabaseUrl || !supabaseKey) {
        return NextResponse.json({ error: 'Supabase configuration error' }, { status: 500 });
    }

    const authHeader = req.headers.get('Authorization') || '';
    const supabase = createClient(supabaseUrl, supabaseKey, {
        global: { headers: { Authorization: authHeader } }
    });

    try {
        // 1. Fetch 1 queued job
        const { data: job, error: jobError } = await supabase
            .from('photo_analysis_jobs')
            .select('*, photos(*)')
            .eq('status', 'queued')
            .order('requested_at', { ascending: true })
            .limit(1)
            .single();

        if (jobError || !job) {
            return NextResponse.json({ message: 'No queued jobs found' });
        }

        // 2. Mark as running
        await supabase
            .from('photo_analysis_jobs')
            .update({ status: 'running', started_at: new Date().toISOString() })
            .eq('id', job.id);

        const photo = job.photos;
        if (!photo) throw new Error("Linked photo not found");

        if (!openaiKey) {
            throw new Error("OpenAI API key is missing");
        }

        const openai = new OpenAI({ apiKey: openaiKey });

        // Generate public URL for the image (assuming public bucket, or you need to download it)
        const { data: urlData } = supabase.storage.from('cat-images').getPublicUrl(photo.storage_path);
        const imageUrl = urlData.publicUrl;

        // 3. Call OpenAI Vision API exactly as spec v1.0/2.0
        const systemPrompt = `You are a professional cat photographer and behaviorist.
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
  "quality_score": number (0.0 to 1.0)
}

Guidelines for Tags:
- Pose: focus on physical shape (e.g. "へそ天", "香箱座り", "丸まり", "のび", "座り", "立ち", "振り向き", "あくび", "毛づくろい")
- Action: focus on movement/context (e.g. "寝る", "遊ぶ", "ジャンプ", "毛づくろい", "甘える")
- Place: where is this? (e.g. "ベッド", "窓辺", "キャットタワー", "箱の中", "床")
- Mood: emotional impression (e.g. "リラックス", "好奇心", "甘えん坊")

Output JUST the valid JSON without any markdown formatting.`;

        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini", // or gpt-4o for production
            messages: [
                {
                    role: "system",
                    content: systemPrompt
                },
                {
                    role: "user",
                    content: [
                        { type: "text", text: "Analyze this image and return JSON." },
                        {
                            type: "image_url",
                            image_url: { url: imageUrl, detail: "low" }
                        }
                    ]
                }
            ],
            response_format: { type: "json_object" },
            max_tokens: 500,
            temperature: 0.2
        });

        const rawContent = response.choices[0].message.content || '{}';
        let parsedJson;
        try {
            parsedJson = JSON.parse(rawContent);
        } catch (e) {
            throw new Error("Failed to parse OpenAI JSON response");
        }

        // 4. Save to photo_analysis_results
        const { error: resultError } = await supabase
            .from('photo_analysis_results')
            .insert({
                photo_id: job.photo_id,
                raw_json: parsedJson,
                pose_tags: parsedJson.pose_tags || [],
                action_tags: parsedJson.action_tags || [],
                place_tags: parsedJson.place_tags || [],
                mood_tags: parsedJson.mood_tags || [],
                object_tags: parsedJson.object_tags || [],
                scene_summary: parsedJson.scene_summary || '',
                quality_score: parsedJson.quality_score || 0.8,
                confidence: 0.95
            });

        if (resultError) throw resultError;

        // 5. Mark job as succeeded
        await supabase
            .from('photo_analysis_jobs')
            .update({ status: 'succeeded', finished_at: new Date().toISOString() })
            .eq('id', job.id);

        // Fire-and-forget: Trigger Collection Aggregator
        fetch(new URL('/api/collection/aggregate', req.url).toString(), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: authHeader
            },
            body: JSON.stringify({ photo_id: job.photo_id })
        }).catch(err => console.error('[AI Worker API] Failed to trigger aggregator:', err));

        return NextResponse.json({ status: 'success', job_id: job.id, parsed: parsedJson });

    } catch (e: any) {
        console.error(`[AI Worker API] Error:`, e);

        // Try to update the job to failed if we know which job it was
        // (Simplified error handling for MVP)

        return NextResponse.json({ error: 'Worker failed', details: e.message }, { status: 500 });
    }
}
