import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockCreateBrowserClient = vi.fn();
const mockParseCookieHeader = vi.fn();
const mockSerializeCookieHeader = vi.fn();

vi.mock('@supabase/ssr', () => ({
    createBrowserClient: (...args: unknown[]) => mockCreateBrowserClient(...args),
    parseCookieHeader: (...args: unknown[]) => mockParseCookieHeader(...args),
    serializeCookieHeader: (...args: unknown[]) => mockSerializeCookieHeader(...args),
}));

describe('supabase-browser', () => {
    beforeEach(() => {
        vi.resetModules();
        mockCreateBrowserClient.mockClear();
        mockParseCookieHeader.mockClear();
        mockSerializeCookieHeader.mockClear();
        mockCreateBrowserClient.mockReturnValue({
            auth: {},
            from: vi.fn(),
        });
        mockSerializeCookieHeader.mockImplementation((name: string, value: string) => `${name}=${value}`);
    });

    it('supabase 객체가 export됨', async () => {
        const { supabase } = await import('../../../src/lib/supabase-browser');
        expect(supabase).toBeDefined();
        expect(typeof supabase).toBe('object');
    });

    it('createBrowserClient가 올바른 auth 옵션으로 호출됨', async () => {
        await import('../../../src/lib/supabase-browser');
        expect(mockCreateBrowserClient).toHaveBeenCalled();
        const options = mockCreateBrowserClient.mock.calls[0][2];
        expect(options).toHaveProperty('auth');
        expect(options.auth).toMatchObject({
            flowType: 'pkce',
            detectSessionInUrl: true,
            persistSession: true,
            autoRefreshToken: true,
        });
    });

    it('createBrowserClient에 url과 key 전달', async () => {
        await import('../../../src/lib/supabase-browser');
        const [url, key] = mockCreateBrowserClient.mock.calls[0];
        expect(typeof url).toBe('string');
        expect(typeof key).toBe('string');
        expect(url.length).toBeGreaterThan(0);
        expect(key.length).toBeGreaterThan(0);
    });

    it('cookies 핸들러가 전달됨', async () => {
        await import('../../../src/lib/supabase-browser');
        const options = mockCreateBrowserClient.mock.calls[0][2];
        expect(options).toHaveProperty('cookies');
        expect(typeof options.cookies.getAll).toBe('function');
        expect(typeof options.cookies.setAll).toBe('function');
    });

    describe('cookie backup', () => {
        let cookies: { getAll: () => any; setAll: (c: any) => void };

        beforeEach(async () => {
            localStorage.clear();
            await import('../../../src/lib/supabase-browser');
            cookies = mockCreateBrowserClient.mock.calls[0][2].cookies;
        });

        it('getAll: sb- 쿠키가 있으면 document.cookie 그대로 반환', () => {
            const parsed = [
                { name: 'sb-token', value: 'abc' },
                { name: 'other', value: 'xyz' },
            ];
            mockParseCookieHeader.mockReturnValue(parsed);
            const spy = vi.spyOn(Storage.prototype, 'getItem');

            const result = cookies.getAll();

            expect(result).toEqual(parsed);
            expect(spy).not.toHaveBeenCalled();
            spy.mockRestore();
        });

        it('getAll: sb- 쿠키 없으면 localStorage 백업에서 복원', () => {
            const noCookies = [{ name: 'other', value: 'xyz' }];
            const backup = [
                { name: 'sb-token.0', value: 'chunk0' },
                { name: 'sb-token.1', value: 'chunk1' },
            ];
            // Storage.prototype 스파이 대신 실제 localStorage 에 써 둔다 — 이 describe
            // 안의 여러 테스트가 getItem/setItem/removeItem 을 번갈아 스파이할 때
            // vi.restoreAllMocks() 가 되돌리지 못하는 상호작용이 있었다(2026-09-16 확인).
            localStorage.setItem('sb-cookie-backup', JSON.stringify(backup));
            mockParseCookieHeader.mockReturnValue(noCookies);
            const cookieSetter = vi.fn();
            Object.defineProperty(document, 'cookie', {
                set: cookieSetter,
                get: () => '',
                configurable: true,
            });

            const result = cookies.getAll();

            expect(result).toEqual([...noCookies, ...backup]);
            expect(cookieSetter).toHaveBeenCalledTimes(2);
        });

        it('setAll: 쿠키 설정 후 sb- 쿠키를 localStorage에 백업', () => {
            const cookiesToSet = [
                { name: 'sb-token.0', value: 'v0', options: { path: '/' } },
                { name: 'sb-token.1', value: 'v1', options: { path: '/' } },
            ];
            const cookieSetter = vi.fn();
            Object.defineProperty(document, 'cookie', {
                set: cookieSetter,
                get: () => 'sb-token.0=v0; sb-token.1=v1',
                configurable: true,
            });
            mockParseCookieHeader.mockReturnValue([
                { name: 'sb-token.0', value: 'v0' },
                { name: 'sb-token.1', value: 'v1' },
            ]);

            cookies.setAll(cookiesToSet);

            expect(cookieSetter).toHaveBeenCalledTimes(2);
            expect(localStorage.getItem('sb-cookie-backup')).toBe(
                JSON.stringify([
                    { name: 'sb-token.0', value: 'v0' },
                    { name: 'sb-token.1', value: 'v1' },
                ]),
            );
        });

        it('setAll: sb- 쿠키 없으면 localStorage 백업 삭제', () => {
            localStorage.setItem('sb-cookie-backup', 'stale'); // 이전 로그인이 남긴 백업을 재현
            Object.defineProperty(document, 'cookie', {
                set: vi.fn(),
                get: () => '',
                configurable: true,
            });
            mockParseCookieHeader.mockReturnValue([]);

            cookies.setAll([{ name: 'sb-token', value: '', options: { maxAge: 0 } }]);

            expect(localStorage.getItem('sb-cookie-backup')).toBeNull();
        });

        // 2026-09-16 버그 수정 — 로그아웃 후 /login 재방문 시 자동 재로그인되던 문제.
        // getAll()이 "쿠키가 없다"만으로 iOS 소실과 방금 로그아웃을 구분 못 해
        // 백업에서 옛 세션을 되살렸다. SIGNED_OUT_KEY 마커로 구분한다.
        // (아래 3개 테스트는 Storage.prototype 스파이 대신 실제 localStorage 읽기/쓰기로
        // 검증한다 — 이 파일에서 여러 테스트가 Storage.prototype.setItem/removeItem을
        // 연달아 스파이할 때 스파이 호출 카운트가 유실되는 vitest/jsdom 상호작용이
        // 있었고, 실제 상태 검증이 더 견고하다.)
        it('setAll: sb- 쿠키 없으면(로그아웃) sb-signed-out 마커를 세운다', () => {
            Object.defineProperty(document, 'cookie', {
                set: vi.fn(),
                get: () => '',
                configurable: true,
            });
            mockParseCookieHeader.mockReturnValue([]);

            cookies.setAll([{ name: 'sb-token', value: '', options: { maxAge: 0 } }]);

            expect(localStorage.getItem('sb-signed-out')).toBe('1');
        });

        it('setAll: sb- 쿠키 있으면(로그인 성공) sb-signed-out 마커를 해제한다', () => {
            localStorage.setItem('sb-signed-out', '1'); // 로그아웃 상태였다고 가정
            Object.defineProperty(document, 'cookie', {
                set: vi.fn(),
                get: () => 'sb-token=v0',
                configurable: true,
            });
            mockParseCookieHeader.mockReturnValue([{ name: 'sb-token', value: 'v0' }]);

            cookies.setAll([{ name: 'sb-token', value: 'v0', options: { path: '/' } }]);

            expect(localStorage.getItem('sb-signed-out')).toBeNull();
        });

        it('getAll: sb-signed-out 마커가 있으면 백업이 있어도 복원하지 않는다 (로그아웃 직후 재로그인 방지)', () => {
            localStorage.setItem('sb-signed-out', '1');
            localStorage.setItem('sb-cookie-backup', JSON.stringify([{ name: 'sb-token', value: 'stale-session' }]));
            const noCookies = [{ name: 'other', value: 'xyz' }];
            mockParseCookieHeader.mockReturnValue(noCookies);
            const cookieSetter = vi.fn();
            Object.defineProperty(document, 'cookie', {
                set: cookieSetter,
                get: () => '',
                configurable: true,
            });

            const result = cookies.getAll();

            expect(result).toEqual(noCookies);
            expect(cookieSetter).not.toHaveBeenCalled();
        });
    });

    // 2026-09-16 버그 수정 — signOut() 이 세션 쿠키 조각 일부를 못 지워 로그아웃해도
    // (새로고침해도) 로그인 상태가 유지되던 문제. 원인과 무관하게 sb- 쿠키를 직접 지운다.
    describe('forceClearSupabaseCookies', () => {
        let forceClearSupabaseCookies: () => void;

        beforeEach(async () => {
            localStorage.clear();
            const mod = await import('../../../src/lib/supabase-browser');
            forceClearSupabaseCookies = mod.forceClearSupabaseCookies;
        });

        it('document.cookie 의 sb- 접두사 쿠키를 전부 지운다(그 외는 건드리지 않는다)', () => {
            mockParseCookieHeader.mockReturnValue([
                { name: 'sb-token.0', value: 'v0' },
                { name: 'sb-token.1', value: 'v1' },
                { name: 'other', value: 'xyz' },
            ]);
            const cookieSetter = vi.fn();
            Object.defineProperty(document, 'cookie', {
                set: cookieSetter,
                get: () => 'sb-token.0=v0; sb-token.1=v1; other=xyz',
                configurable: true,
            });

            forceClearSupabaseCookies();

            expect(cookieSetter).toHaveBeenCalledTimes(2);
        });

        it('localStorage 백업을 지우고 sb-signed-out 마커를 세운다', () => {
            localStorage.setItem('sb-cookie-backup', 'stale');
            mockParseCookieHeader.mockReturnValue([]);
            Object.defineProperty(document, 'cookie', { set: vi.fn(), get: () => '', configurable: true });

            forceClearSupabaseCookies();

            expect(localStorage.getItem('sb-cookie-backup')).toBeNull();
            expect(localStorage.getItem('sb-signed-out')).toBe('1');
        });
    });
});
