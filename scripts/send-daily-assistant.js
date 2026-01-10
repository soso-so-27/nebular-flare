require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

// Check Environment Variables
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error("Error: Missing Supabase credentials");
    process.exit(1);
}
if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
    console.error("Error: Missing FIREBASE_SERVICE_ACCOUNT");
    process.exit(1);
}

// 1. Initialize Supabase
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// 2. Parse Firebase Service Account
let serviceAccount;
try {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
} catch (e) {
    console.error("Error parsing FIREBASE_SERVICE_ACCOUNT JSON:", e.message);
    process.exit(1);
}

// 3. FCM v1 API Authentication (same approach as Edge Functions)
async function getAccessToken() {
    const now = Math.floor(Date.now() / 1000);
    const expiry = now + 3600; // 1 hour

    const header = { alg: 'RS256', typ: 'JWT' };
    const payload = {
        iss: serviceAccount.client_email,
        sub: serviceAccount.client_email,
        aud: 'https://oauth2.googleapis.com/token',
        iat: now,
        exp: expiry,
        scope: 'https://www.googleapis.com/auth/firebase.messaging'
    };

    const encode = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url');
    const headerEncoded = encode(header);
    const payloadEncoded = encode(payload);
    const signatureInput = `${headerEncoded}.${payloadEncoded}`;

    // Sign with RSA private key
    const sign = crypto.createSign('RSA-SHA256');
    sign.update(signatureInput);
    const signature = sign.sign(serviceAccount.private_key, 'base64url');

    const jwt = `${signatureInput}.${signature}`;

    // Exchange JWT for access token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`
    });

    const tokenData = await tokenResponse.json();
    if (!tokenData.access_token) {
        console.error("Token error:", tokenData);
        throw new Error('Failed to get access token');
    }

    return tokenData.access_token;
}

// 4. Send FCM message via HTTP
async function sendFcmMessage(accessToken, token, title, body) {
    const fcmUrl = `https://fcm.googleapis.com/v1/projects/${serviceAccount.project_id}/messages:send`;

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
                    data: { title, body, icon: '/icon.svg' }
                }
            })
        });
        return res.ok;
    } catch (e) {
        console.error('FCM send failed:', e.message);
        return false;
    }
}

// Constants for Anomaly Detection
const BAD_HEALTH_VALUES = [
    '食べない', 'ご飯を残す', '少なめ',
    '元気がない', 'ぐったり', 'おとなしい',
    '2回以上', '1回',
    '下痢', '軟便', '硬い', '血混じり'
];

async function sendDailyAssistant() {
    console.log("Starting Daily Assistant Script...");

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const currentHour = now.getHours();
    console.log(`Current JST hour: ${currentHour}`);

    // Get FCM access token once
    let accessToken;
    try {
        accessToken = await getAccessToken();
        console.log("FCM access token obtained successfully");
    } catch (e) {
        console.error("Failed to get FCM access token:", e.message);
        process.exit(1);
    }

    // Fetch Users with Tokens
    const { data: tokens, error: tokenError } = await supabase
        .from('push_tokens')
        .select('user_id, token');

    if (tokenError || !tokens || tokens.length === 0) {
        console.log("No tokens found. Exiting.");
        return;
    }

    const userIds = [...new Set(tokens.map(t => t.user_id))];
    console.log(`Processing ${userIds.length} users...`);

    let totalSent = 0;
    for (const userId of userIds) {
        const sent = await processUser(userId, tokens.filter(t => t.user_id === userId).map(t => t.token), todayStr, currentHour, accessToken);
        totalSent += sent;
    }

    console.log(`Total notifications sent: ${totalSent}`);
}

async function processUser(userId, userTokens, todayStr, currentHour, accessToken) {
    const { data: user, error: userError } = await supabase
        .from('users')
        .select('household_id, notification_preferences')
        .eq('id', userId)
        .single();

    if (userError || !user) {
        console.error(`Skipping user ${userId}: User data not found`);
        return 0;
    }

    const prefs = user.notification_preferences || { care_reminder: true, health_alert: true, inventory_alert: true, notification_hour: 20 };
    const userHour = prefs.notification_hour ?? 20;

    if (currentHour !== userHour) {
        console.log(`Skipping user ${userId}: Notification hour is ${userHour}, current is ${currentHour}`);
        return 0;
    }

    const messages = [];

    // Health Alert Logic
    if (prefs.health_alert) {
        const { data: observations } = await supabase
            .from('observations')
            .select(`type, value, cats (name, household_id)`)
            .eq('cats.household_id', user.household_id)
            .gte('recorded_at', `${todayStr}T00:00:00`)
            .lt('recorded_at', `${todayStr}T23:59:59`);

        if (observations) {
            const anomalies = observations.filter(obs => obs.cats && BAD_HEALTH_VALUES.includes(obs.value));
            const catAnomalies = {};
            for (const obs of anomalies) {
                const catName = obs.cats.name;
                if (!catAnomalies[catName]) catAnomalies[catName] = [];
                catAnomalies[catName].push(obs.value);
            }
            for (const [catName, values] of Object.entries(catAnomalies)) {
                const uniqueValues = [...new Set(values)];
                messages.push(`⚠️ ${catName}ちゃん: ${uniqueValues.join('、')}`);
            }
        }
    }

    // Care Reminder Logic
    if (prefs.care_reminder) {
        const { data: tasks } = await supabase
            .from('care_task_defs')
            .select('*')
            .eq('household_id', user.household_id)
            .eq('enabled', true)
            .is('deleted_at', null);

        if (tasks && tasks.length > 0) {
            const { data: logs } = await supabase
                .from('care_logs')
                .select('type')
                .eq('household_id', user.household_id)
                .gte('done_at', `${todayStr}T00:00:00`)
                .lt('done_at', `${todayStr}T23:59:59`);

            const logTypes = logs ? logs.map(l => l.type) : [];
            const missing = [];

            for (const task of tasks) {
                const isDone = logTypes.some(t => t.startsWith(task.id));
                if (!isDone) missing.push(task.title);
            }

            if (missing.length > 0) {
                const displayMissing = missing.slice(0, 3);
                const suffix = missing.length > 3 ? '...ほか' : '';
                messages.push(`📝 未記録: ${displayMissing.join('、')}${suffix}`);
            }
        }
    }

    // Inventory Alert Logic
    if (prefs.inventory_alert !== false) {
        const { data: inventory } = await supabase
            .from('inventory')
            .select('label, last_bought, range_max')
            .eq('household_id', user.household_id)
            .is('deleted_at', null);

        if (inventory) {
            const today = new Date();
            const lowStockItems = [];

            for (const item of inventory) {
                if (item.last_bought && item.range_max) {
                    const lastBought = new Date(item.last_bought);
                    const daysSince = Math.floor((today - lastBought) / (1000 * 60 * 60 * 24));
                    if (daysSince >= item.range_max) lowStockItems.push(item.label);
                }
            }

            if (lowStockItems.length > 0) {
                messages.push(`🛒 そろそろ補充: ${lowStockItems.join('、')}`);
            }
        }
    }

    // Send Notification
    if (messages.length > 0) {
        const title = "今日のお知らせ🐾";
        const body = messages.join('\n');

        let successCount = 0;
        for (const token of userTokens) {
            const success = await sendFcmMessage(accessToken, token, title, body);
            if (success) successCount++;
        }
        console.log(`Sent to User ${userId}: ${successCount}/${userTokens.length} success.`);
        return successCount;
    } else {
        console.log(`User ${userId}: No notifications needed.`);
        return 0;
    }
}

sendDailyAssistant();
