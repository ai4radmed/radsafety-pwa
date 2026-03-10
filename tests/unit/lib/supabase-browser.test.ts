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
            mockParseCookieHeader.mockReturnValue(noCookies);
            vi.spyOn(Storage.prototype, 'getItem').mockReturnValue(JSON.stringify(backup));
            const cookieSetter = vi.fn();
            Object.defineProperty(document, 'cookie', {
                set: cookieSetter,
                get: () => '',
                configurable: true,
            });

            const result = cookies.getAll();

            expect(result).toEqual([...noCookies, ...backup]);
            expect(cookieSetter).toHaveBeenCalledTimes(2);
            vi.restoreAllMocks();
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
            const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');

            cookies.setAll(cookiesToSet);

            expect(cookieSetter).toHaveBeenCalledTimes(2);
            expect(setItemSpy).toHaveBeenCalledWith(
                'sb-cookie-backup',
                JSON.stringify([
                    { name: 'sb-token.0', value: 'v0' },
                    { name: 'sb-token.1', value: 'v1' },
                ]),
            );
            vi.restoreAllMocks();
        });

        it('setAll: sb- 쿠키 없으면 localStorage 백업 삭제', () => {
            const cookieSetter = vi.fn();
            Object.defineProperty(document, 'cookie', {
                set: cookieSetter,
                get: () => '',
                configurable: true,
            });
            mockParseCookieHeader.mockReturnValue([]);
            const removeItemSpy = vi.spyOn(Storage.prototype, 'removeItem');

            cookies.setAll([{ name: 'sb-token', value: '', options: { maxAge: 0 } }]);

            expect(removeItemSpy).toHaveBeenCalledWith('sb-cookie-backup');
            vi.restoreAllMocks();
        });
    });
});
