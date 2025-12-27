require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const admin = require('firebase-admin');

// Check Environment Variables
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error("Error: Missing Supabase credentials (SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY)");
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

async function sendMorningReminder() {
    console.log("Starting Morning Reminder Script...");

    // 3. Fetch Tokens from Database
    const { data: tokensData, error } = await supabase
        .from('push_tokens')
        .select('token');

    if (error) {
        console.error("Supabase DB Error:", error);
        process.exit(1);
    }

    if (!tokensData || tokensData.length === 0) {
        console.log("No tokens found in database. Exiting.");
        return;
    }

    // Deduplicate tokens
    const tokens = [...new Set(tokensData.map(t => t.token))];
    console.log(`Found ${tokens.length} unique tokens.`);

    // 4. Construct Message
    const message = {
        notification: {
            title: "朝ごはんの時間です！🐾",
            body: "猫ちゃんがお腹を空かせて待っています🐱"
        },
        tokens: tokens
    };

    // 5. Send Notification
    try {
        // Use sendEachForMulticast for firebase-admin v11+
        const response = await admin.messaging().sendEachForMulticast(message);
        console.log(`${response.successCount} messages sent successfully.`);

        if (response.failureCount > 0) {
            console.log(`${response.failureCount} messages failed.`);
            response.responses.forEach((resp, idx) => {
                if (!resp.success) {
                    // In a real app, you might want to remove invalid tokens here
                    console.log(`Token failed: ${tokens[idx]}`, resp.error.code);
                }
            });
        }
    } catch (err) {
        console.error("Firebase Sending Error:", err);
        process.exit(1);
    }
}

sendMorningReminder();
