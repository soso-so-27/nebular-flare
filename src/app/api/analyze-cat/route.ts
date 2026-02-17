import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

// Ensure we have the necessary environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const openaiApiKey = process.env.OPENAI_API_KEY!;

export async function POST(req: NextRequest) {
    const missing = [];
    if (!supabaseUrl) missing.push('NEXT_PUBLIC_SUPABASE_URL');
    if (!supabaseServiceKey) missing.push('SUPABASE_SERVICE_ROLE_KEY');
    if (!openaiApiKey) missing.push('OPENAI_API_KEY');

    if (missing.length > 0) {
        console.error("Missing environment variables:", missing.join(', '));
        return NextResponse.json({
            error: 'Server configuration error',
            details: `Missing: ${missing.join(', ')}`
        }, { status: 500 });
    }

    try {
        const payload = await req.json();
        const { imageId, imageUrl, catContext } = payload;

        if (!imageUrl || !imageId) {
            return NextResponse.json({ error: 'Missing imageId or imageUrl' }, { status: 400 });
        }

        // Validate target URL (blob: URLs should not reach here, but double check)
        if (imageUrl.startsWith('blob:') || imageUrl.startsWith('data:')) {
            return NextResponse.json({ error: 'Invalid target image URL (blob/data)' }, { status: 400 });
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        const openai = new OpenAI({ apiKey: openaiApiKey });

        // --- Build Prompt ---
        let catContextText = "";
        if (catContext && Array.isArray(catContext)) {
            catContextText = "\n【候補となる猫の情報】\n" + catContext.map((c: any) => `- 名前: ${c.name} (ID: ${c.id})\n  特徴: ${c.notes || '特になし'}`).join("\n");
        }

        const systemPrompt = `
あなたは猫の生態と行動学に精通したAIアシスタントです。
提示された猫の画像を解析し、以下のタスクを実行してください。

### タスク1: 猫の個体識別
候補リストにある猫の中から、画像に写っている猫を特定してください。
- **必ず判定を下す**: 画像に猫が写っている場合、候補リストの中から「最も可能性が高い猫」を必ず1つ選んでください。
- **推論の積極活用**: 不鮮明な場合でも、背景、毛色のトーン、周囲の家具などから消去法で推測してください。
- **判定理由**: なぜその猫だと判断したか（あるいは候補を絞ったか）をポジティブに記述してください。「不明」という言葉の使用を控え、「〜の特徴からXXと推測される」といった表現を心がけてください。

### タスク2: 図鑑（Zukan）の棚分類
画像の内容に基づいて、以下の「図鑑の棚（zukanShelf）」から**必ず最もふさわしいものを1つ**選んでください。
- **どれにも当てはまらない場合は必ず「その他」を選択**してください。結果を空にしたり「不明」と出力したりしないでください。
- **ねんね**: 寝ている、丸まっている、リラックスしている。
- **ごはん**: 食事中、水飲み中、ごはんを催促している。
- **遊び**: おもちゃで遊んでいる、走っている、探索している。
- **甘えん坊**: 人に擦り寄っている、毛づくろい（グルーミング）。
- **いたずら**: 何かを壊している、登ってはいけない場所にいる。
- **ハプニング**: 粗相（排泄失敗）、嘔吐、驚いている顔。
- **ふたり**: 2匹以上の猫が一緒に写っている。
- **窓辺**: 窓際で外を眺めている、日向ぼっこ。
- **おでかけ・病院**: キャリーバッグの中、動物病院、外出先。
- **その他**: 上記に当てはまらない場合。

### タスク3: 構造化メタデータの生成
- **uiTags**: 飼い主が見返したくなる具体的な日本語タグ（最大3つ）。「窓辺パトロール」「ひっくり返り寝」など。
- **注意**: タグに「不明」や「unknown」という言葉を含めないでください。

### 出力フォーマット
以下のJSON形式のみで出力してください。

{
  "catId": "特定された猫のID (不明な場合は null)",
  "catConfidence": 0.0〜1.0,
  "identificationReason": "視覚的な理由または特定できない具体的理由",
  "zukanShelf": "上記の棚名（例：ねんね、ごはん）",
  
  "topCandidates": [
    { "catId": "uuid", "score": 0.0〜1.0, "reason": "判定理由" }
  ],

  "labels": {
    "moment": "sleep|play|meal|cuddle|mischief|accident|grooming|explore|rest|vet|other",
    "mood": "calm|happy|curious|sleepy|excited|grumpy|guilty|unknown",
    "scene": "bed|sofa|window|stairs|tower|floor|outside|vet|toilet|unknown",
    "shot": "closeup|fullbody|two_cats|action|face|profile|back|unknown"
  },

  "uiTags": ["タグ1", "タグ2", "タグ3"],

  "forYouScores": {
    "dailyPick": 0.0〜1.0,
    "weeklyHighlight": 0.0〜1.0
  },
  
  "notes": "解析の簡潔なコメント"
}
`;

        const messagesContent: any[] = [
            { type: 'text' as const, text: systemPrompt + catContextText }
        ];

        // Add Reference Images (validated)
        if (catContext && Array.isArray(catContext)) {
            catContext.forEach((cat: any) => {
                if (cat.referenceImages && Array.isArray(cat.referenceImages)) {
                    cat.referenceImages.forEach((url: string, idx: number) => {
                        // Crucial: Only send valid http(s) URLs to OpenAI
                        if (url && url.startsWith('http')) {
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
                }
            });
        }

        // Add Target Image
        messagesContent.push({ type: 'text', text: `【解析対象の画像】` });
        messagesContent.push({ type: 'image_url', image_url: { url: imageUrl } });

        let completion;
        try {
            completion = await openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [
                    { role: "user", content: messagesContent }
                ],
                max_tokens: 1000,
                temperature: 0.3,
                response_format: { type: "json_object" }
            });
        } catch (apiError: any) {
            console.error("[API] OpenAI API Error (Attempt 1):", apiError.message);

            // Fallback: If timeout or image error, try WITHOUT reference images
            const errorMsg = apiError.message.toLowerCase();
            if (errorMsg.includes('timeout') || errorMsg.includes('image') || errorMsg.includes('download') || errorMsg.includes('context_length_exceeded')) {
                console.log("[API] Falling back to analysis with ONLY target image...");
                const fallbackContent = [
                    { type: 'text' as const, text: systemPrompt + (catContextText ? "\n※参照画像の読み込みに問題が発生したため、名前の情報のみで判定してください。" : "") },
                    { type: 'text' as const, text: `【解析対象の画像】` },
                    { type: 'image_url' as const, image_url: { url: imageUrl } }
                ];

                completion = await openai.chat.completions.create({
                    model: "gpt-4o-mini",
                    messages: [
                        { role: "user", content: fallbackContent }
                    ],
                    max_tokens: 1000,
                    temperature: 0.3,
                    response_format: { type: "json_object" }
                });
            } else {
                throw apiError;
            }
        }

        const resultText = completion.choices[0].message.content;
        if (!resultText) throw new Error("No response from OpenAI");

        const analysisData = JSON.parse(resultText);

        // --- Database Updates (Best Effort) ---
        try {
            // 1. Save full JSON to ai_analysis column
            await supabase.from('cat_images').update({ ai_analysis: analysisData }).eq('id', imageId);

            // 2. Backward compatibility
            if (analysisData.uiTags && Array.isArray(analysisData.uiTags)) {
                const { data: current } = await supabase.from('cat_images').select('tags').eq('id', imageId).maybeSingle();
                if (current) {
                    const newTags = analysisData.uiTags.map((t: string) => ({ name: t, isAi: true, confirmed: false }));
                    const currentTags = Array.isArray(current?.tags) ? current.tags : [];
                    const existingNames = new Set(currentTags.map((t: any) => t.name));
                    const uniqueNewTags = newTags.filter((t: any) => !existingNames.has(t.name));
                    if (uniqueNewTags.length > 0) {
                        await supabase.from('cat_images').update({ tags: [...currentTags, ...uniqueNewTags] }).eq('id', imageId);
                    }
                }
            }
        } catch (dbError: any) {
            console.warn('[API] DB Update skipped:', dbError.message);
        }

        return NextResponse.json({ success: true, ai_analysis: analysisData });

    } catch (error: any) {
        console.error("API Error:", error);
        return NextResponse.json({
            error: error.message || 'Internal Server Error',
            type: error.constructor.name,
            details: error.stack?.split('\n').slice(0, 3).join('\n') // Helpful for debugging 500
        }, { status: 500 });
    }
}
