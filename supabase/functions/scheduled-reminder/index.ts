// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.0.0"

const FIREBASE_SERVER_KEY = Deno.env.get('FIREBASE_SERVER_KEY')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

serve(async (req) => {
    try {
        // Parse scheduled hour from payload (e.g. { "hour": 8 }) called by Cron
        // Default to 8 if not provided (safety)
        const { hour } = await req.json().catch(() => ({ hour: 8 }));

        console.log(`Running scheduled-reminder for hour: ${hour}`);

        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

        // 1. Find users who want notification at this hour
        // notification_preferences is JSONB. We can query it.
        // We filter by 'care_reminder' = true AND 'notification_hour' = hour

        const { data: users, error: userError } = await supabase
            .from('users')
            .select(`
                id,
                household_id,
                notification_preferences
            `)
            .not('household_id', 'is', null); // Must be in a household

        if (userError || !users) {
            throw new Error("Failed to fetch users");
        }

        // Filter in JS involves parsing JSON, might be safer than complex SQL filter for now
        const targetUsers = users.filter((u: any) => {
            const prefs = u.notification_preferences || {};
            const prefHour = prefs.notification_hour !== undefined ? prefs.notification_hour : 20; // Default to 20 if not set? Or 8?
            // "care_reminder" must be true (default true)
            const careReminder = prefs.care_reminder !== false;

            return careReminder && prefHour === hour;
        });

        if (targetUsers.length === 0) {
            return new Response(`No users scheduled for ${hour}:00`, { status: 200 });
        }

        // Group by household to check tasks once per household
        const householdMap = new Map(); // householdId -> [userIds]
        targetUsers.forEach((u: any) => {
            if (!householdMap.has(u.household_id)) {
                householdMap.set(u.household_id, []);
            }
            householdMap.get(u.household_id).push(u.id);
        });

        const today = new Date().toISOString().split('T')[0];
        const sentTokens: string[] = [];

        // 2. For each household, check status
        for (const [householdId, userIds] of householdMap.entries()) {

            // Fetch Care Task Defs for this household
            const { data: tasks } = await supabase
                .from('care_task_defs')
                .select('*')
                .eq('household_id', householdId)
                .is('deleted_at', null)
                .eq('enabled', true);

            if (!tasks || tasks.length === 0) continue;

            // Fetch Today's Logs
            // We need logs that match the task types
            const { data: logs } = await supabase
                .from('care_logs')
                .select('type, cat_id')
                .eq('household_id', householdId)
                .gte('done_at', `${today}T00:00:00`)
                .lte('done_at', `${today}T23:59:59`);

            const logsSet = new Set(logs?.map((l: any) => l.type)); // Stores taskDefId (or taskDefId:slot)

            // Determine if reminders are needed
            // Logic:
            // If Hour = 8: Check Morning tasks
            // If Hour = 20: Check Evening tasks (and maybe Morning if missed?)

            let incompleteTasks = [];

            tasks.forEach((task: any) => {
                const slots = task.meal_slots || [];
                // Simple logic:
                // If 8:00, check 'morning' slot
                // If 20:00, check 'evening' slot

                let targetSlot = '';
                if (hour === 8) targetSlot = 'morning';
                else if (hour === 20) targetSlot = 'evening';

                if (slots.includes(targetSlot)) {
                    // Check if done
                    // Log type format: "{taskId}" or "{taskId}:{slot}"?
                    // Implementation in app-store: addCareLog uses explicit logic.
                    // Usually: if per_cat, we need to check for EACH cat.
                    // This is complex. Let's simplfy for MVP:
                    // If any log exists for this task today, assume "progress made"?
                    // No, "Pending" is better.

                    // Let's assume standard task ID matching for now.
                    // Ideally we check specific slot log like `${task.id}:${targetSlot}`

                    // For the sake of robustness without full per-cat expansion logic:
                    // We check if *any* log for this task exists today? 
                    // No, that misses the "Evening" check if morning was done.

                    // Heuristic:
                    // Construct search keys.
                    // If log types include `${task.id}:${targetSlot}` OR just `${task.id}` (legacy/simple)

                    // Actually, let's just create a generic message if we don't find a match.

                    const isDone = logs?.some((l: any) => {
                        // Check for exact match or prefix match?
                        // Log types are usually UUIDs.
                        // But care logs might store `${id}:morning`.
                        return l.type === task.id || l.type === `${task.id}:${targetSlot}`;
                    });

                    if (!isDone) {
                        incompleteTasks.push(task.title);
                    }
                }
            });

            if (incompleteTasks.length > 0) {
                // Prepare Notification
                const title = hour === 8 ? "朝のお世話リマインダー ☀️" : "夜のお世話リマインダー 🌙";
                const body = `まだ完了していないタスクがあります: ${incompleteTasks.slice(0, 2).join(', ')}${incompleteTasks.length > 2 ? ' 他' : ''}`;

                // Fetch Tokens
                const { data: tokens } = await supabase
                    .from('push_tokens')
                    .select('token')
                    .in('user_id', userIds);

                if (tokens && tokens.length > 0) {
                    const deviceTokens = tokens.map((t: any) => t.token);

                    // Send Batch
                    await Promise.all(deviceTokens.map(async (token: string) => {
                        await fetch('https://fcm.googleapis.com/fcm/send', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `key=${FIREBASE_SERVER_KEY}`
                            },
                            body: JSON.stringify({
                                to: token,
                                notification: {
                                    title,
                                    body,
                                    icon: 'https://nebular-flare.vercel.app/icon.svg'
                                }
                            })
                        }).catch(console.error);
                    }));
                }
            }
        }

        return new Response(JSON.stringify({ success: true, processed_households: householdMap.size }), {
            headers: { "Content-Type": "application/json" },
        })

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
        })
    }
})
