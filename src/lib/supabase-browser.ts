import { createBrowserClient, parseCookieHeader, serializeCookieHeader } from '@supabase/ssr';
import { diagLog } from './session-diag'; // [SESSION-DIAG]

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL || 'https://mock.supabase.co';
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY || 'mock-key';

// iOS standalone PWA에서 앱 종료 시 쿠키가 소실될 수 있으므로
// localStorage에 백업/복원하는 커스텀 쿠키 핸들러 사용
const COOKIE_BACKUP_KEY = 'sb-cookie-backup';

export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
        getAll() {
            if (typeof document === 'undefined') return [];
            const cookies = parseCookieHeader(document.cookie) as { name: string; value: string }[];
            diagLog('L1:getAll', {
                hasSbCookie: cookies.some((c) => c.name.startsWith('sb-')),
                cookieCount: cookies.length,
            }); // [SESSION-DIAG]
            if (cookies.some((c) => c.name.startsWith('sb-'))) return cookies;
            // Cookie 소실 시 localStorage 백업에서 복원
            try {
                const backup = localStorage.getItem(COOKIE_BACKUP_KEY);
                if (backup) {
                    const restored: { name: string; value: string }[] = JSON.parse(backup);
                    restored.forEach(({ name, value }) => {
                        document.cookie = serializeCookieHeader(name, value, {
                            path: '/',
                            maxAge: 400 * 24 * 60 * 60,
                            sameSite: 'lax',
                        });
                    });
                    diagLog('L2:getAll:restored', { count: restored.length, names: restored.map((c) => c.name) }); // [SESSION-DIAG]
                    return [...cookies, ...restored];
                }
            } catch {
                // ignore
            }
            return cookies;
        },
        setAll(cookiesToSet) {
            if (typeof document === 'undefined') return;
            diagLog('L3:setAll', {
                cookies: cookiesToSet.map((c) => ({ n: c.name, v: !!c.value, maxAge: c.options?.maxAge })),
            }); // [SESSION-DIAG]
            cookiesToSet.forEach(({ name, value, options }) => {
                document.cookie = serializeCookieHeader(name, value, options);
            });
            // Supabase 쿠키를 localStorage에 백업
            try {
                const all = parseCookieHeader(document.cookie) as { name: string; value: string }[];
                const sbCookies = all.filter((c) => c.name.startsWith('sb-'));
                if (sbCookies.length > 0) {
                    localStorage.setItem(COOKIE_BACKUP_KEY, JSON.stringify(sbCookies));
                } else {
                    localStorage.removeItem(COOKIE_BACKUP_KEY);
                }
            } catch {
                // ignore
            }
        },
    },
    auth: {
        flowType: 'pkce',
        detectSessionInUrl: true,
        persistSession: true,
        autoRefreshToken: true,
    },
});
