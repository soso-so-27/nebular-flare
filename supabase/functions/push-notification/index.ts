// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.0.0"

const FIREBASE_SERVER_KEY = Deno.env.get('FIREBASE_SERVER_KEY')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

serve(async (req) => {
    try {
        const { record, old_record, type, table, schema } = await req.json()

        // Initialize Supabase Client
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

        // Identify Household and Actor
        const householdId = record.household_id || record.householdId;
        // Observations use 'recorded_by', CareLogs use 'done_by', Inventory has none usually (system or buyer)
        const actorId = record.done_by || record.recorded_by || record.created_by;

        if (!householdId) {
            return new Response("No household_id found", { status: 200 })
        }

        // 1. Fetch all household members with their notification preferences
        const { data: members, error: memberError } = await supabase
            .from('household_members')
            .select(`
                user_id,
                users (
                    id,
                    display_name,
                    notification_preferences
                )
            `)
            .eq('household_id', householdId);

        if (memberError || !members || members.length === 0) {
            return new Response("No members found", { status: 200 })
        }

        // 2. Determine Notification Content & Target Audience
        let notificationTitle = "";
        let notificationBody = "";
        let targetUserIds = [];
        const targets: string[] = [];

        // CASE A: Health Alert (Observations)
        if (table === 'observations' && type === 'INSERT') {
            const isAbnormal = record.value !== "いつも通り" && record.value !== "なし" && record.value !== "記録した";

            // Only notify if abnormal
            if (isAbnormal) {
                // Get Cat Name
                const { data: cat } = await supabase.from('cats').select('name').eq('id', record.cat_id).single();
                const catName = cat?.name || "猫";

                notificationTitle = `${catName}に気になる変化があります`;
                notificationBody = `「${record.value}」が記録されました。確認してください。`;

                // Filter users who have health_alert = true (default true)
                targetUserIds = members.filter((m: any) => {
                    const prefs = m.users?.notification_preferences || {};
                    // If undefined, default to true
                    return prefs.health_alert !== false && m.user_id !== actorId;
                }).map((m: any) => m.user_id);
            }
        }

        // CASE B: Care Action (Care Logs)
        else if (table === 'care_logs' && type === 'INSERT') {
            // Get Task Title if possible, or use raw type
            // Ideally we join care_task_defs, but for speed we'll map common types or use generic
            let actionName = "お世話";
            if (record.type.includes('food') || record.type === 'breakfast' || record.type === 'dinner') actionName = "ごはん";
            if (record.type.includes('toilet') || record.type === 'litter') actionName = "トイレ掃除";

            // Note: We don't have task name easily unless we query or it's in metadata. 
            // MVP: Use simple mapping or generic.

            // Get Actor Name
            const actor = members.find((m: any) => m.user_id === actorId)?.users;
            const actorName = actor?.display_name || "家族";

            notificationTitle = `${actorName}が${actionName}を完了しました`;
            notificationBody = "お世話ありがとうございます！";

            // Filter users. For 'Action Notification', we rely on care_reminder or generic 'always send'
            // Let's check 'care_reminder' for now as a proxy, or send to all (except actor)
            targetUserIds = members.filter((m: any) => {
                const prefs = m.users?.notification_preferences || {};
                // If undefined, default to true. 
                // Some users might want to mute "Action" notifications specifically, but we don't have that key yet.
                // We'll respect 'care_reminder' as a "Care related" toggle.
                return prefs.care_reminder !== false && m.user_id !== actorId;
            }).map((m: any) => m.user_id);
        }

        // CASE C: Inventory Alert (Inventory)
        else if (table === 'inventory' && (type === 'UPDATE' || type === 'INSERT')) {
            // Check urgency
            // Logic: if stock_level changed to low/empty OR calculated days left is low
            // Since we don't have 'days left' in DB column (it's calculated), we rely on stock_level column if available
            // OR we check range_min/max vs last_bought.
            // Simplified: If stock_level is 'low' or 'empty' AND it wasn't before (check old_record).

            const newLevel = record.stock_level;
            const oldLevel = old_record?.stock_level;

            if ((newLevel === 'low' || newLevel === 'empty') && newLevel !== oldLevel) {
                notificationTitle = `${record.label}が少なくなっています`;
                notificationBody = `補充のタイミングかもしれません。`;

                targetUserIds = members.filter((m: any) => {
                    const prefs = m.users?.notification_preferences || {};
                    return prefs.inventory_alert !== false && m.user_id !== actorId; // Actor seeing it might not need push, or maybe they do?
                }).map((m: any) => m.user_id);
            }
        }

        if (targetUserIds.length === 0) {
            return new Response("No targets to notify", { status: 200 })
        }

        // 3. Fetch Push Tokens for Targets
        const { data: tokens, error: tokenError } = await supabase
            .from('push_tokens')
            .select('token')
            .in('user_id', targetUserIds);

        if (tokenError || !tokens || tokens.length === 0) {
            return new Response("No tokens found", { status: 200 })
        }

        const deviceTokens = tokens.map((t: any) => t.token);
        // Deduplicate
        const uniqueTokens = [...new Set(deviceTokens)];

        // 4. Send to FCM
        const fcmPromises = uniqueTokens.map(async (token: string) => {
            // ... (Same legacy fetch logic)
            const res = await fetch('https://fcm.googleapis.com/fcm/send', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `key=${FIREBASE_SERVER_KEY}`
                },
                body: JSON.stringify({
                    to: token,
                    notification: {
                        title: notificationTitle,
                        body: notificationBody,
                        icon: 'https://nebular-flare.vercel.app/icon.svg' // Update with real icon URL
                    }
                })
            });
            return res.json();
        });

        const results = await Promise.all(fcmPromises);

        return new Response(JSON.stringify({ success: true, results_count: results.length }), {
            headers: { "Content-Type": "application/json" },
        })

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
        })
    }
})
