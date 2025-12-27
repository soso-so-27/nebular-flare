import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { ServiceAccount } from "https://deno.land/x/google_jwt_sa@v0.2.3/mod.ts";

const serviceAccount = JSON.parse(Deno.env.get("FIREBASE_SERVICE_ACCOUNT")!);

serve(async (req) => {
    try {
        const { user_id, title, body } = await req.json();
        if (!user_id || !title || !body) throw new Error("Missing fields");

        const supabase = createClient(
            Deno.env.get("SUPABASE_URL")!,
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
        );

        const { data: tokensData, error: dbError } = await supabase
            .from("push_tokens")
            .select("token")
            .eq("user_id", user_id);

        if (dbError) throw dbError;
        if (!tokensData?.length) return new Response(JSON.stringify({ message: "No tokens" }), { status: 200 });

        const uniqueTokens = [...new Set(tokensData.map((t: any) => t.token))];

        // Get Access Token
        const sa = new ServiceAccount(serviceAccount);
        const accessToken = await sa.getAccessToken();
        const projectId = serviceAccount.project_id;

        // Send to each token
        const results = await Promise.all(uniqueTokens.map(async (token) => {
            const res = await fetch(`https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message: {
                        token,
                        notification: { title, body }
                    }
                })
            });
            return res.status; // 200 OK
        }));

        return new Response(JSON.stringify({ sent: results.length, statuses: results }), { headers: { "Content-Type": "application/json" } });
    } catch (err: any) {
        console.error(err);
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
});
