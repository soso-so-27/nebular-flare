require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const admin = require('firebase-admin');

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

// 2. Initialize Firebase Admin
let serviceAccount;
try {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
} catch (e) {
    console.error("Error parsing FIREBASE_SERVICE_ACCOUNT JSON:", e.message);
    process.exit(1);
}

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

// Constants for Anomaly Detection
// Match values from src/lib/constants.ts
const BAD_HEALTH_VALUES = [
    '食べない', 'ご飯を残す', '少なめ', // Food
    '元気がない', 'ぐったり', 'おとなしい', // Energy
    '2回以上', '1回', // Vomit
    '下痢', '軟便', '硬い', '血混じり' // Toilet
];

async function sendDailyAssistant() {
    console.log("Starting Daily Assistant Script...");

    // Get today's date range in JST (approximate for script running at 20:00 JST)
    // Actually, simple ISO string check against UTC is fine if we check "today"
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    // 3. Fetch Users with Preferences and Tokens
    // We need: users -> push_tokens, users -> household_id

    // Step 3a: Get all tokens
    const { data: tokens, error: tokenError } = await supabase
        .from('push_tokens')
        .select('user_id, token');

    if (tokenError || !tokens || tokens.length === 0) {
        console.log("No tokens found. Exiting.");
        return;
    }

    // Deduplicate users to process
    const userIds = [...new Set(tokens.map(t => t.user_id))];
    console.log(`Processing ${userIds.length} users...`);

    for (const userId of userIds) {
        await processUser(userId, tokens.filter(t => t.user_id === userId).map(t => t.token), todayStr);
    }
}

async function processUser(userId, userTokens, todayStr) {
    // 4. Fetch User Context (Household, Preferences)
    const { data: user, error: userError } = await supabase
        .from('users')
        .select('household_id, notification_preferences')
        .eq('id', userId)
        .single();

    if (userError || !user) {
        console.error(`Skipping user ${userId}: User data not found`);
        return;
    }

    const prefs = user.notification_preferences || { care_reminder: true, health_alert: true };
    const messages = [];

    // 5. Health Alert Logic
    if (prefs.health_alert) {
        // Get all cats in household
        // Then get today's observations for those cats
        // We can do a join: observations -> cats -> filter by household_id
        // But RLS might be tricky with service role. Service role bypasses RLS, so we can correct query.

        const { data: observations } = await supabase
            .from('observations')
            .select(`
                type,
                value,
                cats (name, household_id)
            `)
            .eq('cats.household_id', user.household_id)
            .gte('recorded_at', `${todayStr}T00:00:00`)
            .lt('recorded_at', `${todayStr}T23:59:59`);

        if (observations) {
            const anomalies = observations.filter(obs => BAD_HEALTH_VALUES.includes(obs.value));
            if (anomalies.length > 0) {
                // Group by cat?
                const catName = anomalies[0].cats.name;
                const note = anomalies[0].value;
                messages.push(`⚠️ ${catName}ちゃんの様子が「${note}」と記録されています。様子を見てあげてください。`);
            }
        }
    }

    // 6. Care Reminder Logic
    if (prefs.care_reminder) {
        const { data: logs } = await supabase
            .from('care_logs')
            .select('type')
            .eq('household_id', user.household_id)
            .gte('done_at', `${todayStr}T00:00:00`)
            .lt('done_at', `${todayStr}T23:59:59`);

        const logTypes = logs ? logs.map(l => l.type) : [];
        const missing = [];

        // Simple check for core tasks
        if (!logTypes.some(t => t.includes('朝ごはん'))) missing.push('朝ごはん');
        if (!logTypes.some(t => t.includes('夜ごはん') || t === 'food')) missing.push('夜ごはん');
        // 'toilet' check might be loose
        if (!logTypes.some(t => t.includes('トイレ'))) missing.push('トイレ掃除');

        if (missing.length > 0) {
            messages.push(`以下の記録がまだありません: ${missing.join('、')}`);
        }
    }

    // 7. Send Notification if needed
    if (messages.length > 0) {
        const title = "今日のお知らせ🐾";
        const body = messages.join('\n'); // Firebase might truncate, but okay for now

        const payload = {
            notification: { title, body },
            tokens: userTokens
        };

        try {
            const response = await admin.messaging().sendEachForMulticast(payload);
            console.log(`Sent to User ${userId}: ${response.successCount} success.`);
        } catch (e) {
            console.error(`Failed to send to User ${userId}:`, e);
        }
    } else {
        console.log(`User ${userId}: No notifications needed.`);
    }
}

sendDailyAssistant();
