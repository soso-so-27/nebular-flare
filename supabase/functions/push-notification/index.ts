import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import admin from "https://esm.sh/firebase-admin@11.11.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2?target=deno";

const serviceAccountEnv = Deno.env.get("FIREBASE_SERVICE_ACCOUNT");
if (!serviceAccountEnv) {
    throw new Error("Missing FIREBASE_SERVICE_ACCOUNT environment variable");
}
const serviceAccount = JSON.parse(serviceAccountEnv);

if (admin.apps.length === 0) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
    });
}

serve(async (req) => {
    try {
        const { user_id, title, body } = await req.json();

        if (!user_id || !title || !body) {
            return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400 });
        }

        // Initialize Supabase Service Role Client
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const supabase = createClient(supabaseUrl, supabaseKey);

        // Get tokens for the user
        const { data: tokensData, error: dbError } = await supabase
            .from("push_tokens")
            .select("token")
            .eq("user_id", user_id);

        if (dbError) {
            console.error("DB Error:", dbError);
            return new Response(JSON.stringify({ error: dbError.message }), { status: 500 });
        }

        if (!tokensData || tokensData.length === 0) {
            return new Response(JSON.stringify({ message: "No tokens found for user" }), { status: 200 });
        }

        const tokens = tokensData.map((t) => t.token);

        // Remove duplicates if any
        const uniqueTokens = [...new Set(tokens)];

        // Send notification
        const message = {
            notification: {
                title,
                body,
            },
            tokens: uniqueTokens,
        };

        const response = await admin.messaging().sendMulticast(message);

        if (response.failureCount > 0) {
            console.log("Failed tokens:", response.responses.filter(r => !r.success));
            // Todo: remove invalid tokens
        }

        return new Response(JSON.stringify({ message: "Notification sent", successCount: response.successCount }), {
            headers: { "Content-Type": "application/json" },
        });
    } catch (err) {
        console.error("Error:", err);
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
});
