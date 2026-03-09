import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Singleton pattern to prevent multiple GoTrueClient instances
declare global {
    var supabase: SupabaseClient | undefined;
}

let supabaseInstance: SupabaseClient;

if (process.env.NODE_ENV === 'production') {
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey);
} else {
    const globalForSupabase = globalThis as unknown as {
        supabase: ReturnType<typeof createClient>
    }
    if (!globalForSupabase.supabase) {
        globalForSupabase.supabase = createClient(supabaseUrl, supabaseAnonKey)
    }
    supabaseInstance = globalForSupabase.supabase
}

export const supabase = supabaseInstance;
export const isSupabaseReady = !!supabaseUrl && !!supabaseAnonKey;

