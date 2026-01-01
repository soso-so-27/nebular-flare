// Follow this setup guide to deploy: https://supabase.com/docs/guides/functions/deploy-to-production
// 1. supabase login
// 2. supabase functions new push-notification
// 3. Paste this code into supabase/functions/push-notification/index.ts
// 4. supabase functions deploy push-notification
// 5. Set Database Webhook in Supabase Dashboard to trigger this function on INSERT to care_logs

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.0.0"

// For Firebase Admin, we usually need a Service Account JSON.
// Since we are in Deno, we can use the REST API for FCM or a Deno-compatible library.
// Using raw fetch for FCM Legacy HTTP API or V1 (V1 requires JWT, Legacy is easier with Server Key)
// For robustness, here is how to use the Legacy API (simpler for quick start) or plan for V1.
// NOTE: Firebase Cloud Messaging Legacy API is deprecated. We should use HTTP v1.
// However, HTTP v1 requires generating an OAuth2 token from the service account, which is complex in Deno without libraries.
// We will use a placeholder fetch and instruct the user to set FIREBASE_SERVER_KEY env var (Legacy) for simplicity in this demo,
// acknowledging it's deprecated but functional for MVP.

const FIREBASE_SERVER_KEY = Deno.env.get('FIREBASE_SERVER_KEY')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

serve(async (req) => {
    try {
        const { record, type } = await req.json()

        // Check if it's an INSERT event
        if (type !== 'INSERT') {
            return new Response("Not an INSERT event", { status: 200 })
        }

        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

        // 1. Identify the user who did the action
        const actorId = record.done_by || record.recorded_by;
        const householdId = record.household_id;

        // 2. Fetch household members to notify (exclude the actor)
        const { data: members, error: memberError } = await supabase
            .from('household_members')
            .select('user_id')
            .eq('household_id', householdId)
            .neq('user_id', actorId);

        if (memberError || !members || members.length === 0) {
            return new Response("No members to notify", { status: 200 })
        }

        const memberIds = members.map((m: any) => m.user_id);

        // 3. Fetch Push Tokens for these members
        const { data: tokens, error: tokenError } = await supabase
            .from('push_tokens')
            .select('token')
            .in('user_id', memberIds);

        if (tokenError || !tokens || tokens.length === 0) {
            return new Response("No tokens found", { status: 200 })
        }

        const deviceTokens = tokens.map((t: any) => t.token);

        // 4. Construct Message
        let title = "更新がありました";
        let body = "新しい記録があります";

        if (record.type === 'breakfast' || record.type === 'dinner') {
            title = "ごはんの時間 🍚";
            body = "ごはんの記録が追加されました";
        } else if (record.value) { // Observation
            title = "猫の様子 📝";
            body = `記録: ${record.value}`;
        }

        // 5. Send to FCM (Multicast)
        // Using Legacy API for ease of demonstration. 
        // Endpoint: https://fcm.googleapis.com/fcm/send
        const fcmPromises = deviceTokens.map(async (token: string) => {
            const res = await fetch('https://fcm.googleapis.com/fcm/send', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `key=${FIREBASE_SERVER_KEY}`
                },
                body: JSON.stringify({
                    to: token,
                    notification: {
                        title: title,
                        body: body,
                        icon: 'https://nebular-flare.vercel.app/icon.svg'
                    }
                })
            });
            return res.json();
        });

        const results = await Promise.all(fcmPromises);

        return new Response(JSON.stringify({ success: true, results }), {
            headers: { "Content-Type": "application/json" },
        })
    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
        })
    }
})
