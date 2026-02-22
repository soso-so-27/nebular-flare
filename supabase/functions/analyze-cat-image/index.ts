// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

console.log("[AI] analyze-cat-image function started (Legacy Serve Pattern)");

serve(async (req) => {
    // CORS Preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
        const SUPABASE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
        const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')

        if (!OPENAI_API_KEY) throw new Error('Missing OPENAI_API_KEY')
        if (!SUPABASE_URL || !SUPABASE_KEY) throw new Error('Missing Supabase Config')

        const { imageId, imageUrl, catContext } = await req.json()
        if (!imageId || !imageUrl) throw new Error('imageId and imageUrl are required')

        console.log(`[AI] Processing image: ${imageId}, URL: ${imageUrl}`);

        // 1. OpenAI Vision API Call
        const systemPrompt = `あなたは猫の専門家兼、図鑑アプリ「ねこあっぷ」のAIアシスタントです。
提供された猫の画像とプロフィール情報を照らし合わせ、今回の画像に写っている猫を特定し、その状態を詳細に解析してJSONで回答してください。

### 【解析ルール】
1. **猫の識別** (catContextを参照): 名前を特定できない場合は "不明" とします。
2. **図鑑の棚 (zukanShelf)**: 以下から1つ選択してください。
   ['眠り', 'ごはん', '遊び', '甘えん坊', 'いたずら', 'ハプニング', 'ふたり', '窓辺', 'おでかけ・病院', '記念日', 'その他']
3. **ポーズ (pose)**: 以下から1つ選択してください。
   ['香箱座り', 'へそ天', 'スフィンクス', 'まんまる', 'にょろーん', 'ちょこん座り', '箱イン', 'ふみふみ', 'その他']
4. **詳細メタデータ (metadata)**: 各カテゴリから1つ選択してください。
   - **activity**: ['食べる', '飲む', 'トイレ', '毛づくろい', '寝る', '遊ぶ', '甘える', '探索', 'その他']
   - **emotion**: ['ごきげん', '不満', '眠い', 'びっくり', 'ドヤ顔', '真顔', 'あまえ顔', '集中', 'その他']
   - **location**: ['窓辺', 'ベッド', 'ソファ', '棚の上', '玄関', '階段', 'こたつ', 'キャットタワー', 'その他']
   - **physicalPart**: ['肉球', 'おしり', 'しっぽ', 'お腹', 'ヒゲ', '耳', '顔アップ', '背中', 'なし']
   - **healthSymptoms**: ['吐いた', '下痢', '目ヤニ', 'くしゃみ', 'かゆみ', '食欲低下', '元気ない', '震え', 'なし']
   - **event**: ['いたずら', '破壊', '脱走未遂', 'ケンカ', '水こぼし', '登りすぎ', '侵入禁止', 'おもちゃ没収', 'なし']
   - **relationship**: ['ぴったり', '毛づくろい中', '近い', '微妙な距離', 'ケンカ前', '仲直り', '一緒に食事', '追いかけっこ', 'なし']
   - **seasonEvent**: ['換毛期', '暑さ対策', '冬支度', '誕生日', 'クリスマス', 'お正月', 'うちの子記念日', '記念写真', 'なし']
   - **growth**: ['子猫', '成猫', '老猫', '冬毛', '夏毛', '体格の変化', '毛並みの変化', '成長記録', 'その他']
   - **items**: ['おもちゃ', '爪とぎ', 'べッド', '食器', 'おやつ', '首輪', 'キャリーケース', 'ブラシ', 'その他']

### 【出力フォーマット (JSON)】
{
  "catName": "名前",
  "pose": "ポーズ名",
  "zukanShelf": "棚名",
  "metadata": {
    "activity": "...",
    "emotion": "...",
    "location": "...",
    "physicalPart": "...",
    "healthSymptoms": "...",
    "event": "...",
    "relationship": "...",
    "seasonEvent": "...",
    "growth": "...",
    "items": "..."
  },
  "tags": ["タグ1", "タグ2", ...],
  "forYouScores": { "dailyPick": 0-100, "weeklyHighlight": 0-100 },
  "reasoning": "判定理由"
}`;

        const userPrompt = `【登録猫情報】\n${JSON.stringify(catContext || [])}\n\nこの画像を解析してください。`;

        const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: 'gpt-4o',
                messages: [
                    { role: 'system', content: systemPrompt },
                    {
                        role: 'user', content: [
                            { type: 'text', text: userPrompt },
                            { type: 'image_url', image_url: { url: imageUrl } }
                        ]
                    }
                ],
                response_format: { type: "json_object" },
                temperature: 0
            })
        });

        const aiData = await aiResponse.json();
        if (aiData.error) throw new Error(`OpenAI Error: ${aiData.error.message}`);

        const analysis = JSON.parse(aiData.choices[0].message.content);
        console.log("[AI] Analysis Result:", analysis);

        // 2. Update Database
        const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
        const { error: dbError } = await supabase
            .from('cat_images')
            .update({
                ai_analysis: analysis,
                tags: analysis.tags
            })
            .eq('id', imageId);

        if (dbError) throw new Error(`Database Error: ${dbError.message}`);

        return new Response(JSON.stringify({
            success: true,
            analysis
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })

    } catch (e: any) {
        console.error(`[AI] Fatal Error:`, e.message);
        return new Response(JSON.stringify({
            error: e.message
        }), {
            status: 200, // Return 200 to allow the proxy to handle the payload
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
    }
})
