import { createServerClient, parseCookieHeader } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import type { AstroCookies } from 'astro';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL || 'https://mock.supabase.co';
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY || 'mock-key';
const supabaseServiceRoleKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;

export function createSupabaseServerClient(request: Request, cookies: AstroCookies) {
    return createServerClient(supabaseUrl, supabaseAnonKey, {
        cookies: {
            getAll() {
                return parseCookieHeader(request.headers.get('Cookie') ?? '') as { name: string; value: string }[];
            },
            setAll(cookiesToSet) {
                cookiesToSet.forEach(({ name, value, options }) => {
                    cookies.set(name, value, options);
                });
            },
        },
    });
}

// Server-side anonymous client for data queries (no browser session, bypasses cookie issues)
export const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false,
    },
});

/**
 * 재인증 전용 1회성 anon 클라이언트 — 공유 `supabaseAnon` 의 메모리 세션을 건드리지 않는다.
 * 비밀번호 변경 시 "현재 비밀번호" 검증(signInWithPassword)에만 쓴다(2026-09-20).
 */
export function createAnonClient() {
    return createClient(supabaseUrl, supabaseAnonKey, {
        auth: { autoRefreshToken: false, persistSession: false },
    });
}

// Admin client for server-side operations (bypasses RLS)
// Only create if service role key is available
export const supabaseAdmin = supabaseServiceRoleKey
    ? createClient(supabaseUrl, supabaseServiceRoleKey, {
          auth: {
              autoRefreshToken: false,
              persistSession: false,
          },
      })
    : supabaseAnon; // Fallback to anonymous client if no service role key
