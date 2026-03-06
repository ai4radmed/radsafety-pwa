import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@supabase/ssr', () => ({
    createServerClient: vi.fn(),
    parseCookieHeader: vi.fn(),
}));

vi.mock('@supabase/supabase-js', () => ({
    createClient: vi.fn().mockReturnValue({ from: vi.fn() }),
}));

import { createServerClient, parseCookieHeader } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { createSupabaseServerClient, supabaseAnon, supabaseAdmin } from '../../../src/lib/supabase-server';

const mockCreateServerClient = createServerClient as ReturnType<typeof vi.fn>;
const mockParseCookieHeader = parseCookieHeader as ReturnType<typeof vi.fn>;
const mockCreateClient = createClient as ReturnType<typeof vi.fn>;

describe('createSupabaseServerClient', () => {
    beforeEach(() => {
        vi.mocked(mockCreateServerClient).mockReturnValue({ auth: { getSession: vi.fn() } } as any);
        vi.mocked(mockParseCookieHeader).mockReturnValue([]);
    });

    it('Request와 cookies를 받아 createServerClient 호출', () => {
        const mockRequest = new Request('http://test/', {
            headers: { Cookie: 'sb-session=abc' },
        });
        const mockCookies = {
            set: vi.fn(),
        };

        createSupabaseServerClient(mockRequest, mockCookies as any);

        expect(mockCreateServerClient).toHaveBeenCalled();
        expect(mockCreateServerClient.mock.calls[0][0]).toBeDefined(); // supabaseUrl
        expect(mockCreateServerClient.mock.calls[0][1]).toBeDefined(); // anonKey
        expect(mockCreateServerClient.mock.calls[0][2]).toHaveProperty('cookies');
        expect(mockCreateServerClient.mock.calls[0][2].cookies).toHaveProperty('getAll');
        expect(mockCreateServerClient.mock.calls[0][2].cookies).toHaveProperty('setAll');
    });

    it('Cookie 헤더가 있으면 parseCookieHeader로 파싱', () => {
        const cookieHeader = 'sb-session=xyz; path=/';
        const mockRequest = new Request('http://test/', { headers: { Cookie: cookieHeader } });
        const mockCookies = { set: vi.fn() };
        const parsed = [{ name: 'sb-session', value: 'xyz' }];
        mockParseCookieHeader.mockReturnValue(parsed);

        createSupabaseServerClient(mockRequest, mockCookies as any);
        const cookiesConfig = mockCreateServerClient.mock.calls[0][2].cookies;
        const result = cookiesConfig.getAll();

        expect(mockParseCookieHeader).toHaveBeenCalled();
        expect(result).toEqual(parsed);
    });

    it('setAll 시 cookies.set 호출', () => {
        const mockRequest = new Request('http://test/');
        const mockCookies = { set: vi.fn() };

        createSupabaseServerClient(mockRequest, mockCookies as any);
        const lastCall = mockCreateServerClient.mock.calls.at(-1)!;
        const cookiesConfig = lastCall[2].cookies;
        cookiesConfig.setAll([
            { name: 'sb-session', value: 'val1', options: {} },
            { name: 'sb-token', value: 'val2', options: { path: '/' } },
        ]);

        expect(mockCookies.set).toHaveBeenCalledTimes(2);
        expect(mockCookies.set).toHaveBeenNthCalledWith(1, 'sb-session', 'val1', {});
        expect(mockCookies.set).toHaveBeenNthCalledWith(2, 'sb-token', 'val2', { path: '/' });
    });
});

describe('supabaseAnon', () => {
    it('createClient로 생성되어 export됨', () => {
        expect(supabaseAnon).toBeDefined();
        expect(mockCreateClient).toHaveBeenCalled();
    });
});

describe('supabaseAdmin', () => {
    it('export되어 존재함', () => {
        expect(supabaseAdmin).toBeDefined();
    });

    it('서비스 롤 키 없으면 supabaseAnon과 동일 참조', () => {
        // SUPABASE_SERVICE_ROLE_KEY가 없을 때 (기본 테스트 환경)
        expect(supabaseAdmin).toBe(supabaseAnon);
    });
});
