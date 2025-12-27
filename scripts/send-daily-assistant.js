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

    // Get current time in JST
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    // Get current hour in JST (TZ is set to Asia/Tokyo in GitHub Actions)
    const currentHour = now.getHours();
    console.log(`Current JST hour: ${currentHour}`);

    // 3. Fetch Users with Preferences and Tokens
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
        await processUser(userId, tokens.filter(t => t.user_id === userId).map(t => t.token), todayStr, currentHour);
    }
}

async function processUser(userId, userTokens, todayStr, currentHour) {
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

    const prefs = user.notification_preferences || { care_reminder: true, health_alert: true, inventory_alert: true, notification_hour: 20 };

    // Check if current hour matches user's preferred notification time
    const userHour = prefs.notification_hour ?? 20;
    if (currentHour !== userHour) {
        console.log(`Skipping user ${userId}: Notification hour is ${userHour}, current is ${currentHour}`);
        return;
    }

    const messages = [];

    // 5. Health Alert Logic (with cat names)
    if (prefs.health_alert) {
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
            const anomalies = observations.filter(obs => obs.cats && BAD_HEALTH_VALUES.includes(obs.value));

            // Group anomalies by cat name
            const catAnomalies = {};
            for (const obs of anomalies) {
                const catName = obs.cats.name;
                if (!catAnomalies[catName]) catAnomalies[catName] = [];
                catAnomalies[catName].push(obs.value);
            }

            // Create messages per cat
            for (const [catName, values] of Object.entries(catAnomalies)) {
                const uniqueValues = [...new Set(values)];
                messages.push(`⚠️ ${catName}ちゃん: ${uniqueValues.join('、')}`);
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
        if (!logTypes.some(t => t.includes('トイレ'))) missing.push('トイレ掃除');

        if (missing.length > 0) {
            messages.push(`📝 未記録: ${missing.join('、')}`);
        }
    }

    // 7. Inventory Alert Logic (date-based)
    if (prefs.inventory_alert !== false) { // Default to true if not set
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

                    if (daysSince >= item.range_max) {
                        lowStockItems.push(item.label);
                    }
                }
            }

            if (lowStockItems.length > 0) {
                messages.push(`🛒 そろそろ補充: ${lowStockItems.join('、')}`);
            }
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
