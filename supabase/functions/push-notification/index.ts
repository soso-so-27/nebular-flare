// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function getServiceAccount(raw: string | undefined) {
    try {
        if (!raw) return null;
        return JSON.parse(raw);
    } catch (e) { return null; }
}

async function getAccessToken(serviceAccount: any): Promise<string> {
    if (!serviceAccount || !serviceAccount.client_email || !serviceAccount.private_key) {
        throw new Error('Firebase Service Account Invalid or Missing');
    }
    const now = Math.floor(Date.now() / 1000);
    const payload = {
        iss: serviceAccount.client_email,
        sub: serviceAccount.client_email,
        aud: 'https://oauth2.googleapis.com/token',
        iat: now, exp: now + 3600,
        scope: 'https://www.googleapis.com/auth/firebase.messaging'
    };
    const encode = (obj: any) => {
        const bytes = new TextEncoder().encode(JSON.stringify(obj));
        return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    };
    const headerEncoded = encode({ alg: 'RS256', typ: 'JWT' });
    const payloadEncoded = encode(payload);
    const signatureInput = `${headerEncoded}.${payloadEncoded}`;
    const pemContents = serviceAccount.private_key.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s/g, '');
    const binaryKey = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));
    const cryptoKey = await crypto.subtle.importKey('pkcs8', binaryKey, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
    const signatureBytes = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', cryptoKey, new TextEncoder().encode(signatureInput));
    const signature = btoa(String.fromCharCode(...new Uint8Array(signatureBytes))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    const jwt = `${signatureInput}.${signature}`;
    const res = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`
    });
    const data = await res.json();
    if (!data.access_token) throw new Error(data.error_description || 'FCM Token Exchange Failed');
    return data.access_token;
}

serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
    const SUPABASE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const FCM_RAW = Deno.env.get('FIREBASE_SERVICE_ACCOUNT')

    const supabase = createClient(SUPABASE_URL!, SUPABASE_KEY!);
    const log = async (entry: any) => {
        try { await supabase.from('notification_logs').insert(entry); } catch (e) { }
    };

    try {
        const payload = await req.json().catch(() => ({}));
        const { type, record } = payload;
        const actorId = record?.done_by || record?.recorded_by || record?.created_by;

        if (type === 'PING') {
            let tokenCount = 0;
            if (actorId) {
                const { count } = await supabase.from('push_tokens').select('*', { count: 'exact', head: true }).eq('user_id', actorId);
                tokenCount = count || 0;
            }
            return new Response(JSON.stringify({
                status: 'pong',
                version: '2.6-logs',
                user_id: actorId,
                active_tokens: tokenCount,
                note: tokenCount > 1 ? "⚠️ 複数のトークンが登録されています。重複送信の原因になります。" : "正常な登録数です。"
            }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        if (type === 'LOGS') {
            const { data, error } = await supabase
                .from('notification_logs')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(20);
            return new Response(JSON.stringify({ logs: data, error }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        if (type === 'DEBUG_TOKENS' && record?.user_id) {
            const { data, error } = await supabase
                .from('push_tokens')
                .select('*')
                .eq('user_id', record.user_id);
            return new Response(JSON.stringify({ tokens: data, error }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        await log({ event_type: 'RECEPTION', message: `Type: ${type}, Table: ${payload.table}`, payload });

        if (!SUPABASE_URL || !SUPABASE_KEY || !FCM_RAW) {
            throw new Error(`Missing Secrets: ${[!SUPABASE_URL ? 'URL' : '', !SUPABASE_KEY ? 'KEY' : '', !FCM_RAW ? 'FCM_RAW' : ''].filter(Boolean).join(',')}`);
        }

        const serviceAccount = getServiceAccount(FCM_RAW);
        if (!serviceAccount) throw new Error("FIREBASE_SERVICE_ACCOUNT is not valid JSON");

        if (type === 'TEST' || payload.table) {
            const accessToken = await getAccessToken(serviceAccount);
            let targetIds: string[] = [];
            let title = "🔔 通知テスト", body = "接続テスト成功です！";

            if (type === 'TEST') {
                if (!actorId) throw new Error("created_by missing in record");
                targetIds = [actorId];
            } else {
                let householdId = record?.household_id || record?.householdId;
                if (payload.table === 'cat_images' && record?.cat_id) {
                    const { data: cat } = await supabase.from('cats').select('household_id').eq('id', record.cat_id).single();
                    householdId = cat?.household_id;
                }
                if (!householdId) return new Response("No household", { status: 200, headers: corsHeaders });
                const { data: members } = await supabase.from('household_members').select('user_id').eq('household_id', householdId);
                const ids = members?.map(m => m.user_id) || [];
                const { data: users } = await supabase.from('users').select('id, notification_preferences, display_name').in('id', ids);
                const actor = users?.find(u => u.id === actorId);

                if (payload.table === 'incidents') {
                    title = "⚠️ 緊急記録"; body = `${actor?.display_name || '家族'}が異変を記録しました。`;
                    targetIds = users?.filter(u => u.id !== actorId && u.notification_preferences?.health_alert !== false).map(u => u.id) || [];
                } else if (payload.table === 'cat_images') {
                    title = "📸 写真投稿"; body = `${actor?.display_name || '家族'}が写真を投稿しました。`;
                    targetIds = users?.filter(u => u.id !== actorId && u.notification_preferences?.photo_alert !== false).map(u => u.id) || [];
                } else if (payload.table === 'care_logs') {
                    title = "✅ お世話完了"; body = `${actor?.display_name || '家族'}がお世話を完了しました。`;
                    targetIds = users?.filter(u => u.id !== actorId && u.notification_preferences?.care_reminder !== false).map(u => u.id) || [];
                }
            }

            if (targetIds.length === 0) return new Response("No target users", { status: 200, headers: corsHeaders });

            // Fundamental Fix: Get unique tokens, prioritizing the most recently updated ones
            const { data: tokens } = await supabase
                .from('push_tokens')
                .select('user_id, token, platform, updated_at')
                .in('user_id', targetIds)
                .order('updated_at', { ascending: false });

            const tokenList = tokens || [];

            // Deduplicate: Only one token per (user_id, platform) to prevent double-sends on same device
            const seen = new Set();
            const uniqueTokens = tokenList.filter(t => {
                const key = `${t.user_id}-${t.platform}`;
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
            });

            const results = await Promise.all(uniqueTokens.map(async (t) => {
                const fcmRes = await fetch(`https://fcm.googleapis.com/v1/projects/${serviceAccount.project_id}/messages:send`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${accessToken}` },
                    body: JSON.stringify({ message: { token: t.token, notification: { title, body }, data: { title, body } } })
                });
                const fcmData = await fcmRes.json();

                // Cleanup invalid tokens
                if (fcmRes.status === 404 || fcmRes.status === 410 || (fcmData.error?.details?.[0]?.errorCode === 'UNREGISTERED')) {
                    await supabase.from('push_tokens').delete().eq('token', t.token);
                }

                return { user_id: t.user_id, status: fcmRes.status, response: fcmData };
            }));

            await log({ event_type: 'FCM_RESULT', message: `Sent to ${results.length} tokens`, payload: results });
            return new Response(JSON.stringify({ success: true, results }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        return new Response("OK", { status: 200, headers: corsHeaders });
    } catch (e) {
        await log({ event_type: 'ERROR', message: e.message, error_details: { stack: e.stack } });
        return new Response(JSON.stringify({ error: e.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
});
