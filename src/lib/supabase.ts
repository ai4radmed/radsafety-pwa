
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL || 'https://mock.supabase.co';
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY || 'mock-key';
const supabaseServiceRoleKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;

// Custom cookie storage for Supabase (works in both browser and SSR)
const cookieStorage = {
    getItem: (key: string) => {
        if (typeof document === 'undefined') return null;
        const cookies = document.cookie.split(';');
        const cookie = cookies.find(c => c.trim().startsWith(`${key}=`));
        if (!cookie) return null;
        try {
            return decodeURIComponent(cookie.split('=').slice(1).join('='));
        } catch {
            return null;
        }
    },
    setItem: (key: string, value: string) => {
        if (typeof document === 'undefined') return;
        document.cookie = `${key}=${encodeURIComponent(value)}; path=/; max-age=31536000; SameSite=Lax`;
    },
    removeItem: (key: string) => {
        if (typeof document === 'undefined') return;
        document.cookie = `${key}=; path=/; max-age=0`;
    }
};

// Client for browser/authenticated requests
// Use cookie-based storage for Astro SSR compatibility
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        storage: cookieStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        flowType: 'pkce'
    }
});

// Admin client for server-side operations (bypasses RLS)
// Only create if service role key is available
export const supabaseAdmin = supabaseServiceRoleKey
    ? createClient(supabaseUrl, supabaseServiceRoleKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    })
    : supabase; // Fallback to regular client if no service role key
