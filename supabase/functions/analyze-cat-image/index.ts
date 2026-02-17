// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7"

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    console.log(`[AI] Function invoked at ${new Date().toISOString()}`)

    try {
        const payload = await req.json()

        let imageId = payload.imageId
        let imageUrl = payload.imageUrl
        // catContext: [{ id, name, notes, referenceImages: string[] }]
        const catContext = payload.catContext

        // Webhook trigger handling (optional fallback)
        if (!imageId && payload.record) {
            imageId = payload.record.id
            const storagePath = payload.record.storage_path
            imageUrl = `${SUPABASE_URL}/storage/v1/object/public/cat-images/${storagePath}`
        }

        if (!imageUrl) {
            return new Response(JSON.stringify({ error: 'Missing imageUrl' }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }

        if (!OPENAI_API_KEY) {
            console.warn('[AI] OPENAI_API_KEY not found. Returning mock response.')
            return new Response(JSON.stringify({
                success: true,
                mock: true,
                ai_analysis: {
                    cat_id: null,
                    cat_confidence: 0,
                    ui_tags: ["APIキー未設定", "モック"],
                    labels: { moment: "other", mood: "unknown", scene: "unknown", shot: "unknown" }
                }
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }

        // --- Build Prompt ---

        // Prepare context text
        let catContextText = "";
        if (catContext && Array.isArray(catContext)) {
            catContextText = "\n【候補となる猫の情報】\n" + catContext.map(c => `- 名前: ${c.name} (ID: ${c.id})\n  特徴: ${c.notes || '特になし'}`).join("\n");
        }

        const systemPrompt = `
あなたは猫の生態と行動学に精通したAIアシスタントです。
提示された猫の画像を解析し、以下の2つのタスクを実行してください。

### タスク1: 猫の個体識別
候補リストにある猫の中から、画像に写っている猫を特定してください。
- **誤判定の回避を最優先**してください。自信がない場合は勇気を持って「不明 (null)」と判断してください。
- 判定基準：顔立ち、柄、体格、毛色が矛盾なく一致すること。

### タスク2: 構造化メタデータの生成
画像の状況を「固定ラベル」と「情緒的タグ」に分解して記述してください。
- **labels (固定語彙)**: システムが分類に使用する厳格なカテゴリ。
- **uiTags (表示用)**: 飼い主が見返したくなるような、30文字以内の短い日本語タグ（最大3つ）。
  - 禁止: 「かわいい」「癒し」「最高」などの抽象的な感想語。
  - 推奨: 「まるまり寝」「窓辺パトロール」「ごはん待ち」など、具体的な行動やシーン。

### 出力フォーマット
以下のJSON形式のみで出力してください。Markdownのコードブロックは不要です。

{
  "catId": "特定された猫のID (不明な場合は null)",
  "catConfidence": 0.0〜1.0の数値 (0.85以上で確定, 0.65以上で要確認, 0.65未満はnull推奨),
  "needUserConfirm": true/false (catConfidenceが0.65〜0.85の場合はtrue),
  
  "topCandidates": [
    { "catId": "uuid", "score": 0.0〜1.0, "reason": "判定理由" }
  ],

  "labels": {
    "moment": "sleep|play|meal|cuddle|mischief|grooming|explore|rest|vet|other",
    "mood": "calm|happy|curious|sleepy|excited|grumpy|unknown",
    "scene": "bed|sofa|window|stairs|tower|floor|outside|vet|unknown",
    "shot": "closeup|fullbody|two_cats|action|face|profile|back|unknown",
    "quality": {
      "sharpness": 0.0〜1.0,
      "brightness": 0.0〜1.0,
      "faceVisible": 0.0〜1.0,
      "duplicateRisk": 0.0〜1.0 (類似写真としての捨て画像リスク)
    }
  },

  "uiTags": ["タグ1", "タグ2", "タグ3"],

  "forYouScores": {
    "dailyPick": 0.0〜1.0 (今日のベストショット適性),
    "weeklyHighlight": 0.0〜1.0 (週間ハイライト適性),
    "funnyMoment": 0.0〜1.0 (面白画像適性)
  },
  
  "notes": "解析の簡潔なコメント"
}
`;

        const messagesContent: any[] = [
            { type: 'text', text: systemPrompt + catContextText }
        ];

        // Add Reference Images
        if (catContext && Array.isArray(catContext)) {
            catContext.forEach(cat => {
                if (cat.referenceImages && Array.isArray(cat.referenceImages)) {
                    cat.referenceImages.forEach((url, idx) => {
                        if (url) {
                            messagesContent.push({
                                type: 'text',
                                text: `【参照画像】名前: ${cat.name} (ID: ${cat.id}) - 参考${idx + 1}`
                            });
                            messagesContent.push({
                                type: 'image_url',
                                image_url: { url: url }
                            });
                        }
                    });
                } else if (cat.avatarUrl) {
                    // Fallback for backward compatibility
                    messagesContent.push({
                        type: 'text',
                        text: `【参照画像】名前: ${cat.name} (ID: ${cat.id})`
                    });
                    messagesContent.push({
                        type: 'image_url',
                        image_url: { url: cat.avatarUrl }
                    });
                }
            });
        }

        // Add Target Image
        messagesContent.push({ type: 'text', text: `【解析対象の画像】` });
        messagesContent.push({ type: 'image_url', image_url: { url: imageUrl } });

        // Call OpenAI
        console.log(`[AI] Calling OpenAI with ${messagesContent.length} parts...`)
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${OPENAI_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [{ role: 'user', content: messagesContent }],
                max_tokens: 1000,
                response_format: { type: "json_object" }
            }),
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`OpenAI API Error: ${response.status} - ${errText}`);
        }

        const aiResult = await response.json();
        const content = aiResult.choices[0].message?.content;
        const analysisData = JSON.parse(content);

        console.log(`[AI] Analysis complete. CatID: ${analysisData.catId}, Tags: ${analysisData.uiTags?.join(',')}`);

        // DB Update
        if (imageId && imageId !== 'temp' && imageId.length > 10) {
            await updateAiAnalysis(imageId, analysisData);
        }

        return new Response(JSON.stringify({
            success: true,
            ai_analysis: analysisData
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })

    } catch (error) {
        console.error(`[AI] Error:`, error)
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
    }
})

async function updateAiAnalysis(imageId: string, analysisData: any) {
    // Basic validation
    if (!analysisData || typeof analysisData !== 'object') return;

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // 1. Save full JSON to ai_analysis column
    const { error: jsonError } = await supabase
        .from('cat_images')
        .update({ ai_analysis: analysisData })
        .eq('id', imageId);

    if (jsonError) console.error('[AI] DB Update Error (JSON):', jsonError);

    // 2. Backward compatibility: Add uiTags to legacy tags array
    if (analysisData.uiTags && Array.isArray(analysisData.uiTags)) {
        const { data: current } = await supabase.from('cat_images').select('tags').eq('id', imageId).single();
        const newTags = analysisData.uiTags.map(t => ({ name: t, isAi: true, confirmed: false }));
        // Merge avoiding duplicates (simple check)
        const existingNames = new Set((current?.tags || []).map(t => t.name));
        const uniqueNewTags = newTags.filter(t => !existingNames.has(t.name));

        if (uniqueNewTags.length > 0) {
            const combined = [...(current?.tags || []), ...uniqueNewTags];
            await supabase.from('cat_images').update({ tags: combined }).eq('id', imageId);
        }
    }
}
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    console.log(`[AI] Function invoked at ${new Date().toISOString()}`)
    console.log(`[AI] OPENAI_API_KEY present: ${!!OPENAI_API_KEY}`)

    try {
        const payload = await req.json()
        console.log(`[AI] Received payload:`, JSON.stringify(payload))

        // Handle both manual trigger and DB Webhook trigger
        let imageId = payload.imageId
        let imageUrl = payload.imageUrl
        const catContext = payload.catContext // Array of { id, name, notes }

        // If it's a DB Webhook (Supabase standard format), extract from record
        if (!imageId && payload.record) {
            imageId = payload.record.id
            const storagePath = payload.record.storage_path

            // Construct Public URL
            imageUrl = `${SUPABASE_URL}/storage/v1/object/public/cat-images/${storagePath}`
            console.log(`[AI] Webhook extraction result: imageId=${imageId}, imageUrl=${imageUrl}`)
        }

        if (!imageUrl) {
            console.error('[AI] CRITICAL ERROR: Missing imageUrl after extraction effort.')
            return new Response(JSON.stringify({ error: 'Missing imageUrl' }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }

        console.log(`[AI] Starting analysis for Image...`)

        // ... (API Key check and propagation delay) ...
        await new Promise(resolve => setTimeout(resolve, 2000))

        if (!OPENAI_API_KEY) {
            console.warn('[AI] OPENAI_API_KEY not found. Performing mock tagging.')
            const fallbacks = ["ねこ", "日常"];
            if (imageId && imageId !== 'temp') await updateTags(imageId, fallbacks);
            return new Response(JSON.stringify({ success: true, tags: fallbacks, message: 'Mock analysis done' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }

        // Prepare Prompt with Cat Context
        let catContextText = "";
        if (catContext && Array.isArray(catContext)) {
            catContextText = "\n【候補となる猫の情報】\n" + catContext.map(c => `- ${c.name} (ID: ${c.id}): ${c.notes || '特徴なし'}`).join("\n");
        }

        // Prepare OpenAI Messages with Reference Images
        const messagesContent: any[] = [
            {
                type: 'text',
                text: `猫の画像解析エキスパートとして、画像内の猫の行動や感情を1〜3つの日本語タグで表現してください。
また、画像に写っている猫を以下の候補リストから特定してください。${catContextText}

【判定の手順】
1. まず、提示される「参照画像（登録済みの猫）」を確認してください。
2. 次に、最後に提示される「解析対象の画像」を詳しく見てください。
3. 参照画像の猫と、解析対象を比較し、顔立ち、柄、体格、毛色が最も一致する猫の catId を返してください。
4. 特徴がどの参照画像とも一致しない場合は、catId を null にしてください。

【出力形式】
返信は以下のJSON形式のみで出力してください:
{ 
  "tags": ["タグ1", "タグ2"], 
  "catId": "特定された猫のID (不明な場合は null)",
  "confidence": "判定の自信 (0.0〜1.0)"
}`
            }
        ];

        // Add Reference Images for each cat in context
        if (catContext && Array.isArray(catContext)) {
            catContext.forEach(cat => {
                if (cat.avatarUrl) {
                    messagesContent.push({
                        type: 'text',
                        text: `【参照画像】名前: ${cat.name}, ID: ${cat.id}`
                    });
                    messagesContent.push({
                        type: 'image_url',
                        image_url: { url: cat.avatarUrl }
                    });
                }
            });
        }

        // Add target image last
        messagesContent.push({
            type: 'text',
            text: `【解析対象の画像】`
        });
        messagesContent.push({
            type: 'image_url',
            image_url: { url: imageUrl }
        });

        // Call OpenAI Vision API with retries
        let lastError = null
        let result = null
        for (let attempt = 1; attempt <= 3; attempt++) {
            try {
                console.log(`[AI] Calling OpenAI Vision API with ${messagesContent.length} parts...`)
                const response = await fetch('https://api.openai.com/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${OPENAI_API_KEY}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        model: 'gpt-4o-mini',
                        messages: [
                            {
                                role: 'user',
                                content: messagesContent,
                            },
                        ],
                        response_format: { type: "json_object" }
                    }),
                })
                // ... rest of logic for response parsing ...
                if (!response.ok) {
                    const errText = await response.text()
                    throw new Error(`OpenAI API failed: ${response.status} - ${errText}`)
                }
                result = await response.json()
                break;
            } catch (error) {
                lastError = error;
                await new Promise(r => setTimeout(r, 2000));
            }
        }

        if (!result) throw lastError || new Error('All attempts failed')

        const content = result.choices[0].message?.content
        const aiResponse = JSON.parse(content)
        const tags = aiResponse.tags || []
        const detectedCatId = aiResponse.catId

        console.log(`[AI] Tags: ${tags.join(', ')}, Cat ID: ${detectedCatId}`)

        // Only update DB if specific imageId is provided and NOT 'temp'
        if (imageId && imageId !== 'temp' && imageId.length > 10) {
            await updateTags(imageId, tags)
        }

        return new Response(JSON.stringify({
            success: true,
            tags,
            catId: detectedCatId,
            confidence: aiResponse.confidence
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })

    } catch (error) {
        console.error(`[AI] UNHANDLED ERROR:`, error)
        return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
    }
})

const isUUID = (uuid: string) => {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uuid);
};

async function updateTags(imageId, tagNames) {
    if (!isUUID(imageId)) {
        console.log(`[AI] Skipping DB update: "${imageId}" is not a valid UUID.`);
        return;
    }
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    const aiTags = tagNames.map(name => ({ name, isAi: true, confirmed: false }))
    const { data: current } = await supabase.from('cat_images').select('tags').eq('id', imageId).single()
    const combined = [...(current?.tags || []), ...aiTags]
    await supabase.from('cat_images').update({ tags: combined }).eq('id', imageId)
}
