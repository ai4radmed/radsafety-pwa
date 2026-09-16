import { createBrowserClient, parseCookieHeader, serializeCookieHeader } from '@supabase/ssr';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL || 'https://mock.supabase.co';
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY || 'mock-key';

// iOS standalone PWA에서 앱 종료 시 쿠키가 소실될 수 있으므로
// localStorage에 백업/복원하는 커스텀 쿠키 핸들러 사용
const COOKIE_BACKUP_KEY = 'sb-cookie-backup';

// 로그아웃 직후 신호. getAll() 은 "쿠키가 없다"는 사실만으로는 iOS가 쿠키를
// 지운 것인지 방금 로그아웃한 것인지 구분할 수 없어, 로그아웃 후에도 백업에서
// 세션을 되살려 재로그인시키는 버그가 있었다(2026-09-16, PR #43 프리뷰 실측 —
// 로그아웃 후 /login 재방문 시 자동 재로그인). 이 마커가 있는 동안은 복원을
// 건너뛴다. 새 로그인이 실제로 성공해 setAll 이 유효한 쿠키를 쓸 때만 해제된다.
const SIGNED_OUT_KEY = 'sb-signed-out';

export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
        getAll() {
            if (typeof document === 'undefined') return [];
            const cookies = parseCookieHeader(document.cookie) as { name: string; value: string }[];
            if (cookies.some((c) => c.name.startsWith('sb-'))) return cookies;
            try {
                if (localStorage.getItem(SIGNED_OUT_KEY)) return cookies;
            } catch {
                // ignore
            }
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
                    return [...cookies, ...restored];
                }
            } catch {
                // ignore
            }
            return cookies;
        },
        setAll(cookiesToSet) {
            if (typeof document === 'undefined') return;
            cookiesToSet.forEach(({ name, value, options }) => {
                document.cookie = serializeCookieHeader(name, value, options);
            });
            // Supabase 쿠키를 localStorage에 백업
            try {
                const all = parseCookieHeader(document.cookie) as { name: string; value: string }[];
                const sbCookies = all.filter((c) => c.name.startsWith('sb-'));
                if (sbCookies.length > 0) {
                    localStorage.setItem(COOKIE_BACKUP_KEY, JSON.stringify(sbCookies));
                    localStorage.removeItem(SIGNED_OUT_KEY);
                } else {
                    localStorage.removeItem(COOKIE_BACKUP_KEY);
                    localStorage.setItem(SIGNED_OUT_KEY, '1');
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

/**
 * signOut() 이후 방어적으로 호출한다. 세션이 큰 경우 supabase-js 가 쿠키를
 * 여러 조각(sb-<ref>-auth-token.0, .1, ...)으로 나눠 저장하는데, signOut() 이
 * 항상 모든 조각을 지운다고 보장되지 않는 케이스가 실측됐다(2026-09-16, Stage B
 * 프리뷰 — claimUsername 으로 비밀번호까지 설정한 계정에서 로그아웃해도
 * sb-* 쿠키가 남아 새로고침해도 로그인 상태가 유지됨). 정확한 원인과 무관하게
 * document.cookie 에 남은 sb- 접두사 쿠키를 전부 직접 지워 확실히 로그아웃시킨다.
 */
export function forceClearSupabaseCookies() {
    if (typeof document === 'undefined') return;
    try {
        const cookies = parseCookieHeader(document.cookie) as { name: string; value: string }[];
        cookies
            .filter((c) => c.name.startsWith('sb-'))
            .forEach(({ name }) => {
                document.cookie = serializeCookieHeader(name, '', { path: '/', maxAge: 0 });
            });
        localStorage.removeItem(COOKIE_BACKUP_KEY);
        localStorage.setItem(SIGNED_OUT_KEY, '1');
    } catch {
        // ignore
    }
}
