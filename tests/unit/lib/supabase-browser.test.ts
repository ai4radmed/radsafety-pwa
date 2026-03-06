import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockCreateBrowserClient = vi.fn();
vi.mock('@supabase/ssr', () => ({
    createBrowserClient: (...args: unknown[]) => mockCreateBrowserClient(...args),
}));

describe('supabase-browser', () => {
    beforeEach(() => {
        vi.resetModules();
        mockCreateBrowserClient.mockClear();
        mockCreateBrowserClient.mockReturnValue({
            auth: {},
            from: vi.fn(),
        });
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
});
