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
    console.error('[REMINDER] Failed to parse FIREBASE_SERVICE_ACCOUNT');
}

// Generate JWT for FCM v1 API (same as push-notification)
async function getAccessToken(): Promise<string> {
    const now = Math.floor(Date.now() / 1000);
    const expiry = now + 3600; // 1 hour

    const header = {
        alg: 'RS256',
        typ: 'JWT'
    };

    const payload = {
        iss: serviceAccount.client_email,
        sub: serviceAccount.client_email,
        aud: 'https://oauth2.googleapis.com/token',
        iat: now,
        exp: expiry,
        scope: 'https://www.googleapis.com/auth/firebase.messaging'
    };

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

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`
    });

    const tokenData = await tokenResponse.json();

    if (!tokenData.access_token) {
        throw new Error('Failed to get access token');
    }

    return tokenData.access_token;
}

serve(async (req) => {
    try {
        const { hour } = await req.json().catch(() => ({ hour: 8 }));

        console.log(`[REMINDER] Running for hour: ${hour}`);

        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

        // 1. Find users who want notification at this hour
        const { data: users, error: userError } = await supabase
            .from('users')
            .select(`
                id,
                household_id,
                notification_preferences
            `)
            .not('household_id', 'is', null);

        if (userError || !users) {
            throw new Error("Failed to fetch users");
        }

        const targetUsers = users.filter((u: any) => {
            const prefs = u.notification_preferences || {};
            const prefHour = prefs.notification_hour !== undefined ? prefs.notification_hour : 20;
            const careReminder = prefs.care_reminder !== false;
            return careReminder && prefHour === hour;
        });

        if (targetUsers.length === 0) {
            return new Response(`No users scheduled for ${hour}:00`, { status: 200 });
        }

        // Group by household
        const householdMap = new Map();
        targetUsers.forEach((u: any) => {
            if (!householdMap.has(u.household_id)) {
                householdMap.set(u.household_id, []);
            }
            householdMap.get(u.household_id).push(u.id);
        });

        const today = new Date().toISOString().split('T')[0];
        let totalNotifications = 0;

        // Get FCM access token once for all sends
        const accessToken = await getAccessToken();
        const projectId = serviceAccount.project_id;
        const fcmUrl = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;

        // 2. For each household, check status
        for (const [householdId, userIds] of householdMap.entries()) {

            const { data: tasks } = await supabase
                .from('care_task_defs')
                .select('*')
                .eq('household_id', householdId)
                .is('deleted_at', null)
                .eq('enabled', true);

            if (!tasks || tasks.length === 0) continue;

            const { data: logs } = await supabase
                .from('care_logs')
                .select('type, cat_id')
                .eq('household_id', householdId)
                .gte('done_at', `${today}T00:00:00`)
                .lte('done_at', `${today}T23:59:59`);

            let incompleteTasks: string[] = [];

            tasks.forEach((task: any) => {
                const slots = task.meal_slots || [];
                let targetSlot = '';
                if (hour === 8) targetSlot = 'morning';
                else if (hour === 20) targetSlot = 'evening';

                if (slots.includes(targetSlot)) {
                    const isDone = logs?.some((l: any) => {
                        return l.type === task.id || l.type === `${task.id}:${targetSlot}`;
                    });

                    if (!isDone) {
                        incompleteTasks.push(task.title);
                    }
                }
            });

            if (incompleteTasks.length > 0) {
                const title = hour === 8 ? "朝のお世話リマインダー ☀️" : "夜のお世話リマインダー 🌙";
                const body = `まだ完了していないタスクがあります: ${incompleteTasks.slice(0, 2).join(', ')}${incompleteTasks.length > 2 ? ' 他' : ''}`;

                const { data: tokens } = await supabase
                    .from('push_tokens')
                    .select('token')
                    .in('user_id', userIds);

                if (tokens && tokens.length > 0) {
                    const deviceTokens = [...new Set(tokens.map((t: any) => t.token))];

                    // Send using FCM v1 API
                    await Promise.all(deviceTokens.map(async (token: string) => {
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
                                        data: {
                                            title,
                                            body,
                                            icon: '/icon.svg'
                                        }
                                    }
                                })
                            });

                            if (res.ok) totalNotifications++;
                        } catch (e) {
                            console.error('[REMINDER] FCM send failed:', e.message);
                        }
                    }));
                }
            }
        }

        return new Response(JSON.stringify({
            success: true,
            processed_households: householdMap.size,
            notifications_sent: totalNotifications
        }), {
            headers: { "Content-Type": "application/json" },
        })

    } catch (error) {
        console.error('[REMINDER] Error:', error.message);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
        })
    }
})
