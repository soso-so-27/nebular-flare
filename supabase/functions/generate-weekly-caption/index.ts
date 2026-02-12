// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    // CORS Preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
        if (!OPENAI_API_KEY) {
            throw new Error('Missing OPENAI_API_KEY');
        }

        const { incidents, careLogs, photos, catProfile } = await req.json();

        // 1. Construct the Context
        const incidentText = incidents?.map((i: any) =>
            `- ${new Date(i.created_at).toLocaleDateString()}: ${i.type} (${i.note || ''})`
        ).join('\n') || '特になし';

        const careText = careLogs?.map((c: any) =>
            `- ${new Date(c.done_at).toLocaleDateString()}: ${c.category} (${c.notes || ''})`
        ).join('\n') || '特になし';

        const photoCount = photos?.length || 0;
        const catName = catProfile?.name || '猫ちゃん';

        // 2. Craft the Prompt
        const systemPrompt = `
【役割 (System Prompt)】
あなたは、ユーザーがそのままInstagramに投稿したくなる「今週のアルバム」の帯コピーを作るコピーライターです。
飼い主から提供された1週間の記録（出来事／お世話／写真の枚数）をもとに、写真の余韻を邪魔しない短い一文で、その週を総括してください。
※ポエム（詩的比喩の連発・過剰な感傷）は避け、**自然で上品な“日常の可愛さ”**を言葉にします。

【制約事項】
- 字数：52文字〜72文字程度（インスタ転用で“恥ずかしくない短さ”を優先。デザイン崩れ防止）
- トーン：カジュアルで清潔感のある温かさ（詩人っぽさ、過剰にエモい言い回しは禁止）
- 内容：ログにある情報から、共感されやすい具体（行動／しぐさ／場面）を最低1つ必ず入れる（抽象語だけで終えない）
- 事実性：ログにない事実を作らない／病名・原因の断定や推測をしない（心配がある場合は「気になった」「様子見」などに留める）
- まとめ方：次のどれか1つの型を選んで作る（自動選択でOK）
    1. あるある共感型（「結局ここが定位置」など）
    2. ギャップ型（やんちゃ⇄甘え、元気⇄まったり等の対比）
    3. 見出し型（「今週のハイライト：AとB」）
- 文末：**「〜な一週間でした。」**で締める（「日々でした。」でも可）
- 出力：一文のみ／改行なし／絵文字なし
`;

        const userPrompt = `
# 対象の猫
名前: ${catName}

# 今週の記録
## 出来事・体調
${incidentText}

## お世話記録
${careText}

## 写真
今週は ${photoCount} 枚の思い出が残されました。

この1週間を総括するコピーをお願いします。
`;

        // 3. Call OpenAI
        const res = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini', // Cost-effective and fast
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ],
                temperature: 0.7,
                max_tokens: 100,
            })
        });

        const data = await res.json();
        if (data.error) {
            throw new Error(`OpenAI Error: ${data.error.message}`);
        }

        const generatedCaption = data.choices?.[0]?.message?.content?.trim();

        return new Response(JSON.stringify({ caption: generatedCaption }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

    } catch (error) {
        console.error('Error:', error.message);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
});
