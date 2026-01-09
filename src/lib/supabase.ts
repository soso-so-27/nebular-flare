import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/types/database';

// Validate required environment variables at module load time
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error(
        '[Supabase] Missing required environment variables:',
        !SUPABASE_URL ? 'NEXT_PUBLIC_SUPABASE_URL' : '',
        !SUPABASE_ANON_KEY ? 'NEXT_PUBLIC_SUPABASE_ANON_KEY' : ''
    );
}

let client: ReturnType<typeof createBrowserClient<Database>> | undefined;

export function createClient() {
    if (client) return client;

    // Throw descriptive error if env vars are missing
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
        throw new Error(
            'Supabase configuration is missing. Please ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set in your environment.'
        );
    }

    client = createBrowserClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY);
    return client;
}

