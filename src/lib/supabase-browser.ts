import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL || 'https://mock.supabase.co';
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY || 'mock-key';

// Browser client: uses @supabase/ssr for chunked cookie support (compatible with server's createServerClient)
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        flowType: 'pkce',
        // 모바일 앱에서 딥링크 처리를 위한 설정
        detectSessionInUrl: true,
        persistSession: true,
        autoRefreshToken: true,
    },
});
