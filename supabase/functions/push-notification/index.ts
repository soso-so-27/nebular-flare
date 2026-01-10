// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.0.0"

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const FIREBASE_SERVICE_ACCOUNT = Deno.env.get('FIREBASE_SERVICE_ACCOUNT')!

// Parse service account JSON
let serviceAccount: any;
try {
    serviceAccount = JSON.parse(FIREBASE_SERVICE_ACCOUNT);
} catch (e) {
    console.error('[PUSH] Failed to parse FIREBASE_SERVICE_ACCOUNT');
}

// Generate JWT for FCM v1 API
async function getAccessToken(): Promise<string> {
    const now = Math.floor(Date.now() / 1000);
    const expiry = now + 3600; // 1 hour

    // Create JWT header
    const header = {
        alg: 'RS256',
        typ: 'JWT'
    };

    // Create JWT payload
    const payload = {
        iss: serviceAccount.client_email,
        sub: serviceAccount.client_email,
        aud: 'https://oauth2.googleapis.com/token',
        iat: now,
        exp: expiry,
        scope: 'https://www.googleapis.com/auth/firebase.messaging'
    };

    // Base64URL encode
    const encode = (obj: any) => {
        const str = JSON.stringify(obj);
        const bytes = new TextEncoder().encode(str);
        return btoa(String.fromCharCode(...bytes))
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '');
    };

    const headerEncoded = encode(header);
    const payloadEncoded = encode(payload);
    const signatureInput = `${headerEncoded}.${payloadEncoded}`;

    // Import private key and sign
    const privateKeyPem = serviceAccount.private_key;
    const pemContents = privateKeyPem
        .replace('-----BEGIN PRIVATE KEY-----', '')
        .replace('-----END PRIVATE KEY-----', '')
        .replace(/\s/g, '');
    const binaryKey = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));

    const cryptoKey = await crypto.subtle.importKey(
        'pkcs8',
        binaryKey,
        { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
        false,
        ['sign']
    );

    const signatureBytes = await crypto.subtle.sign(
        'RSASSA-PKCS1-v1_5',
        cryptoKey,
        new TextEncoder().encode(signatureInput)
    );

    const signature = btoa(String.fromCharCode(...new Uint8Array(signatureBytes)))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

    const jwt = `${signatureInput}.${signature}`;

    // Exchange JWT for access token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`
    });

    const tokenData = await tokenResponse.json();
    console.log('[PUSH] Token exchange status:', tokenResponse.status);

    if (!tokenData.access_token) {
        console.error('[PUSH] Token error:', JSON.stringify(tokenData));
        throw new Error('Failed to get access token');
    }

    return tokenData.access_token;
}

serve(async (req) => {
    console.log('[PUSH] Function started');

    try {
        const payload = await req.json()
        console.log('[PUSH] Received payload:', JSON.stringify(payload, null, 2));

        const { record, old_record, type, table, schema } = payload;
        console.log('[PUSH] Table:', table, '| Type:', type);

        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

        const householdId = record?.household_id || record?.householdId;
        const actorId = record?.done_by || record?.recorded_by || record?.created_by;

        console.log('[PUSH] householdId:', householdId, '| actorId:', actorId);

        if (!householdId) {
            console.log('[PUSH] EARLY EXIT: No household_id found');
            return new Response("No household_id found", { status: 200 })
        }

        // 1. Fetch household members (without JOIN)
        console.log('[PUSH] Fetching household members...');
        const { data: memberRows, error: memberError } = await supabase
            .from('household_members')
            .select('user_id')
            .eq('household_id', householdId);

        if (memberError || !memberRows || memberRows.length === 0) {
            console.log('[PUSH] EARLY EXIT: No members found');
            return new Response("No members found", { status: 200 })
        }

        const memberUserIds = memberRows.map((m: any) => m.user_id);
        console.log('[PUSH] Member user IDs:', memberUserIds);

        // 2. Fetch user details separately
        console.log('[PUSH] Fetching user details...');
        const { data: users, error: usersError } = await supabase
            .from('users')
            .select('id, display_name, notification_preferences')
            .in('id', memberUserIds);

        console.log('[PUSH] Users found:', users?.length, '| Error:', usersError?.message);

        if (usersError || !users || users.length === 0) {
            console.log('[PUSH] EARLY EXIT: No users found');
            return new Response("No users found", { status: 200 })
        }

        // 3. Determine Notification Content & Target Audience
        let notificationTitle = "";
        let notificationBody = "";
        let targetUserIds: string[] = [];

        // === CASE X: Incidents (Record Notice) ===
        if (table === 'incidents' && type === 'INSERT') {
            const { data: cat } = await supabase.from('cats').select('name').eq('id', record.cat_id).single();
            const catName = cat?.name || "猫";

            const actor = users.find((u: any) => u.id === actorId);
            const actorName = actor?.display_name || "家族";

            // Map incident types to readable labels
            const typeLabels: Record<string, string> = {
                vomit: '嘔吐',
                diarrhea: '下痢',
                injury: '怪我',
                appetite: '食欲不振',
                energy: '元気がない',
                toilet: 'トイレ失敗',
                other: 'その他'
            };
            const typeLabel = typeLabels[record.type] || record.type;

            notificationTitle = `⚠️ ${catName}の気付き: ${typeLabel}`;
            notificationBody = `${actorName}が気付きを記録しました。「${record.note || '詳細なし'}」`;

            targetUserIds = users.filter((u: any) => {
                const prefs = u.notification_preferences || {};
                // Use health_alert as default preference
                return prefs.health_alert !== false && u.id !== actorId;
            }).map((u: any) => u.id);
        }

        // === CASE Y: Today's Photo (cat_images) ===
        else if (table === 'cat_images' && type === 'INSERT') {
            const { data: cat } = await supabase.from('cats').select('name').eq('id', record.cat_id).single();
            const catName = cat?.name || "猫";

            const actor = users.find((u: any) => u.id === actorId);
            const actorName = actor?.display_name || "家族";

            notificationTitle = `📸 ${catName}の今日の一枚`;
            notificationBody = `${actorName}が新しい写真を投稿しました！`;

            targetUserIds = users.filter((u: any) => {
                const prefs = u.notification_preferences || {};
                // New preference: photo_alert (default true if undefined)
                return prefs.photo_alert !== false && u.id !== actorId;
            }).map((u: any) => u.id);
        }

        // CASE A: Health Alert (Observations)
        if (table === 'observations' && type === 'INSERT') {
            console.log('[PUSH] Processing observation. Value:', record.value);
            const isAbnormal = record.value !== "いつも通り" && record.value !== "なし" && record.value !== "記録した" && record.value !== "撮影した";
            const isPhoto = record.value === "撮影した" || (record.images && record.images.length > 0);
            console.log('[PUSH] isAbnormal:', isAbnormal, '| isPhoto:', isPhoto);

            // Get cat name for notification
            const { data: cat } = await supabase.from('cats').select('name').eq('id', record.cat_id).single();
            const catName = cat?.name || "猫";

            // Get actor name
            const actor = users.find((u: any) => u.id === actorId);
            const actorName = actor?.display_name || "家族";

            if (isPhoto) {
                // CASE A1: Photo posted (Daily Snap)
                notificationTitle = `📷 ${actorName}が${catName}の写真を投稿しました`;
                notificationBody = `今日の一枚が届きました！チェックしてみましょう。`;

                targetUserIds = users.filter((u: any) => {
                    const prefs = u.notification_preferences || {};
                    // Use health_alert preference for now, or could add photo_share preference later
                    const shouldNotify = prefs.health_alert !== false && u.id !== actorId;
                    console.log('[PUSH] User', u.id, '| photo notif | isActor:', u.id === actorId, '| shouldNotify:', shouldNotify);
                    return shouldNotify;
                }).map((u: any) => u.id);
            } else if (isAbnormal) {
                // CASE A2: Abnormal observation (existing logic)
                notificationTitle = `${catName}に気になる変化があります`;
                notificationBody = `「${record.value}」が記録されました。確認してください。`;

                targetUserIds = users.filter((u: any) => {
                    const prefs = u.notification_preferences || {};
                    const shouldNotify = prefs.health_alert !== false && u.id !== actorId;
                    console.log('[PUSH] User', u.id, '| health_alert:', prefs.health_alert, '| isActor:', u.id === actorId, '| shouldNotify:', shouldNotify);
                    return shouldNotify;
                }).map((u: any) => u.id);
            }
        }

        // CASE B: Care Action (Care Logs)
        else if (table === 'care_logs' && type === 'INSERT') {
            console.log('[PUSH] Processing care_log. Type:', record.type);

            let actionName = "お世話";
            if (record.type?.includes('food') || record.type === 'breakfast' || record.type === 'dinner') actionName = "ごはん";
            if (record.type?.includes('toilet') || record.type === 'litter') actionName = "トイレ掃除";

            const actor = users.find((u: any) => u.id === actorId);
            const actorName = actor?.display_name || "家族";

            notificationTitle = `${actorName}が${actionName}を完了しました`;
            notificationBody = "お世話ありがとうございます！";

            targetUserIds = users.filter((u: any) => {
                const prefs = u.notification_preferences || {};
                const shouldNotify = prefs.care_reminder !== false && u.id !== actorId;
                console.log('[PUSH] User', u.id, '| care_reminder:', prefs.care_reminder, '| isActor:', u.id === actorId, '| shouldNotify:', shouldNotify);
                return shouldNotify;
            }).map((u: any) => u.id);
        }

        // CASE C: Inventory Alert
        else if (table === 'inventory' && (type === 'UPDATE' || type === 'INSERT')) {
            console.log('[PUSH] Processing inventory. Level:', record.stock_level, '| Old:', old_record?.stock_level);

            const newLevel = record.stock_level;
            const oldLevel = old_record?.stock_level;

            if ((newLevel === 'low' || newLevel === 'empty') && newLevel !== oldLevel) {
                notificationTitle = `${record.label}が少なくなっています`;
                notificationBody = `補充のタイミングかもしれません。`;

                targetUserIds = users.filter((u: any) => {
                    const prefs = u.notification_preferences || {};
                    return prefs.inventory_alert !== false && u.id !== actorId;
                }).map((u: any) => u.id);
            }
        } else {
            console.log('[PUSH] EARLY EXIT: Unhandled table/type combination');
            return new Response("Unhandled event", { status: 200 });
        }

        console.log('[PUSH] Target user IDs:', targetUserIds);
        console.log('[PUSH] Notification title:', notificationTitle);

        if (targetUserIds.length === 0) {
            console.log('[PUSH] EARLY EXIT: No targets to notify');
            return new Response("No targets to notify", { status: 200 })
        }

        // 4. Fetch Push Tokens for Targets
        console.log('[PUSH] Fetching push tokens...');
        const { data: tokens, error: tokenError } = await supabase
            .from('push_tokens')
            .select('token')
            .in('user_id', targetUserIds);

        console.log('[PUSH] Tokens found:', tokens?.length, '| Error:', tokenError?.message);

        if (tokenError || !tokens || tokens.length === 0) {
            console.log('[PUSH] EARLY EXIT: No tokens found');
            return new Response("No tokens found", { status: 200 })
        }

        const deviceTokens = tokens.map((t: any) => t.token);
        const uniqueTokens = [...new Set(deviceTokens)];
        console.log('[PUSH] Unique tokens:', uniqueTokens.length);

        // 5. Get access token for FCM v1 API
        console.log('[PUSH] Getting FCM access token...');
        const accessToken = await getAccessToken();
        console.log('[PUSH] Access token obtained');

        // 6. Send to FCM v1 API
        const projectId = serviceAccount.project_id;
        const fcmUrl = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;
        console.log('[PUSH] Sending to FCM v1:', fcmUrl);

        const fcmPromises = uniqueTokens.map(async (token: string) => {
            try {
                const res = await fetch(fcmUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${accessToken}`
                    },
                    body: JSON.stringify({
                        message: {
                            token: token,
                            // Use data-only message - Service Worker will display notification
                            data: {
                                title: notificationTitle,
                                body: notificationBody,
                                icon: '/icon.svg'
                            }
                        }
                    })
                });

                console.log('[PUSH] FCM response status:', res.status);
                const responseText = await res.text();
                console.log('[PUSH] FCM raw response:', responseText.substring(0, 300));

                try {
                    return JSON.parse(responseText);
                } catch {
                    return { error: 'Invalid response', status: res.status, body: responseText.substring(0, 200) };
                }
            } catch (fetchError) {
                console.error('[PUSH] FCM fetch error:', fetchError.message);
                return { error: fetchError.message };
            }
        });

        const results = await Promise.all(fcmPromises);
        console.log('[PUSH] All FCM results:', results.length);

        return new Response(JSON.stringify({ success: true, results_count: results.length, results }), {
            headers: { "Content-Type": "application/json" },
        })

    } catch (error) {
        console.error('[PUSH] ERROR:', error.message, error.stack);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
        })
    }
})
