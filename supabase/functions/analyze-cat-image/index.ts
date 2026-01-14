// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7"

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
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

        // If it's a DB Webhook (Supabase standard format), extract from record
        if (!imageId && payload.record) {
            imageId = payload.record.id
            const storagePath = payload.record.storage_path

            // Construct Public URL
            imageUrl = `${SUPABASE_URL}/storage/v1/object/public/cat-images/${storagePath}`
            console.log(`[AI] Webhook extraction result: imageId=${imageId}, imageUrl=${imageUrl}`)
        }

        if (!imageId || !imageUrl) {
            console.error('[AI] CRITICAL ERROR: Missing imageId or imageUrl after extraction effort.')
            return new Response(JSON.stringify({ error: 'Missing imageId or imageUrl' }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }

        console.log(`[AI] Starting analysis for Image ${imageId}...`)

        // Small delay to ensure storage record is globally accessible
        console.log(`[AI] Waiting 2 seconds for storage propagation...`)
        await new Promise(resolve => setTimeout(resolve, 2000))

        if (!OPENAI_API_KEY) {
            console.warn('[AI] OPENAI_API_KEY not found. Performing mock tagging.')
            // Fallback: Random dummy tags if no key
            const fallbacks = ["ねこ", "日常"];
            await updateTags(imageId, fallbacks);
            return new Response(JSON.stringify({ success: true, message: 'Mock analysis done (No API Key)' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }

        // Call OpenAI Vision API with retries
        let lastError = null
        let result = null
        for (let attempt = 1; attempt <= 3; attempt++) {
            try {
                console.log(`[AI] Calling OpenAI Vision API (Attempt ${attempt})...`)
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
                                content: [
                                    {
                                        type: 'text',
                                        text: `猫の画像解析エキスパートとして、画像内の猫の行動や感情を1〜3つの日本語タグで表現してください。
 especialmente、「遊び」と「喧嘩」を慎重に見分けてください。

【判断基準】
- 遊び: 耳が前向き、しっぽがリラックス、爪が出ていない、取っ組み合っていてもリラックスした表情。
- 喧嘩: 耳が後ろに水平に倒れている（イカ耳）、毛が逆立っている、しっぽが太い、鋭い表情、爪が出ている。
- 判断に迷う場合: 「喧嘩（要確認）」というタグを使用してください。

【出力例】
寝顔、ごはん、おもちゃ、見守り、リラックス、あくび、パトロール、仲良し。

返信は以下のJSON形式のみで出力してください:
{ "tags": ["タグ1", "タグ2"] }`
                                    },
                                    {
                                        type: 'image_url',
                                        image_url: { url: imageUrl },
                                    },
                                ],
                            },
                        ],
                        response_format: { type: "json_object" }
                    }),
                })

                if (!response.ok) {
                    const errText = await response.text()
                    console.error(`[AI] OpenAI API Error (Attempt ${attempt}): ${response.status} - ${errText}`)
                    lastError = new Error(`OpenAI API failed: ${response.status} - ${errText}`)

                    // Specific check for invalid_image_url which often means "too new"
                    if (errText.includes('invalid_image_url') || response.status === 400) {
                        console.log('[AI] Image URL might be too new. Retrying in 3 seconds...')
                        await new Promise(resolve => setTimeout(resolve, 3000))
                        continue // Retry
                    }
                    throw lastError // For other non-retryable errors
                }

                result = await response.json()
                break; // If successful, break out of the retry loop

            } catch (error) {
                lastError = error
                console.error(`[AI] Error during OpenAI API call (Attempt ${attempt}):`, error.message)
                if (attempt < 3) {
                    console.log(`[AI] Retrying in 3 seconds...`)
                    await new Promise(resolve => setTimeout(resolve, 3000))
                }
            }
        }

        if (!result) {
            console.error(`[AI] All OpenAI API attempts failed. Last error:`, lastError)
            throw lastError || new Error('All OpenAI API attempts failed without a specific error.')
        }

        if (!result.choices || result.choices.length === 0) {
            console.error(`[AI] OpenAI API returned no choices. Response:`, JSON.stringify(result))
            throw new Error(`OpenAI API returned no choices: ${JSON.stringify(result.error || 'Unknown error')}`)
        }

        const choice = result.choices[0]
        const content = choice.message?.content

        if (!content) {
            console.error(`[AI] OpenAI API returned empty content in choice 0. choice:`, JSON.stringify(choice))
            throw new Error('OpenAI API returned empty content')
        }

        let tags = []
        try {
            tags = JSON.parse(content).tags || []
        } catch (e) {
            console.error(`[AI] Failed to parse JSON from OpenAI content: "${content}"`, e)
            // Attempt to extract tags via regex if JSON fails
            const matches = content.match(/\["(.*)"\]/)
            if (matches) {
                tags = matches[1].split('","')
            } else {
                throw new Error('Could not parse tags from OpenAI response')
            }
        }

        console.log(`[AI] Successfully generated tags: ${tags.join(', ')}`)

        await updateTags(imageId, tags)
        console.log(`[AI] Database update complete for ${imageId}`)

        return new Response(JSON.stringify({ success: true, tags }), {
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

async function updateTags(imageId, tagNames) {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Prepare tags object
    const aiTags = tagNames.map(name => ({
        name,
        isAi: true,
        confirmed: false
    }))

    // Get current tags to avoid overwriting user tags (though usually empty at upload)
    const { data: current } = await supabase
        .from('cat_images')
        .select('tags')
        .eq('id', imageId)
        .single()

    const existingTags = current?.tags || []
    const combined = [...existingTags, ...aiTags]

    const { error } = await supabase
        .from('cat_images')
        .update({ tags: combined })
        .eq('id', imageId)

    if (error) throw error
}
