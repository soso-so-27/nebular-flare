import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
        return NextResponse.json({
            error: 'Server configuration error',
            details: 'Missing Supabase URL or Anon Key in environment variables'
        }, { status: 500 });
    }

    try {
        const body = await req.json();

        // Proxy to remote Supabase Edge Function
        const targetUrl = `${supabaseUrl}/functions/v1/analyze-cat-image`;

        console.log(`[Proxy] Forwarding analysis request to ${targetUrl}`);

        const response = await fetch(targetUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': supabaseAnonKey,
                'Authorization': req.headers.get('Authorization') || `Bearer ${supabaseAnonKey}`
            },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const errText = await response.text();
            console.error(`[Proxy] Error from Edge Function:`, errText);
            return NextResponse.json({
                error: 'Edge Function error',
                details: errText
            }, { status: response.status });
        }

        const data = await response.json();
        return NextResponse.json(data);

    } catch (e: any) {
        console.error(`[Proxy] Unexpected error:`, e);
        return NextResponse.json({
            error: 'Unexpected server error',
            details: e.message
        }, { status: 500 });
    }
}
