import { describe, it, expect, vi, beforeEach } from 'vitest';
import { initAuthHandler } from '../../../src/lib/auth-handler';
import { supabase, forceClearSupabaseCookies } from '../../../src/lib/supabase-browser';
import { setUser, clearUser } from '../../../src/store/user';

// Mocking dependencies
vi.mock('../../../src/lib/supabase-browser', () => ({
    supabase: {
        auth: {
            onAuthStateChange: vi.fn(),
            getSession: vi.fn(() => Promise.resolve({ data: { session: null }, error: null })),
        },
        from: vi.fn(() => ({
            select: vi.fn(() => ({
                eq: vi.fn(() => ({
                    maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null })),
                    eq: vi.fn(() => ({
                        maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null })),
                    })),
                })),
            })),
            insert: vi.fn(() => Promise.resolve({ data: null, error: null })),
            update: vi.fn(() => ({ eq: vi.fn(() => Promise.resolve({ data: null, error: null })) })),
        })),
    },
    forceClearSupabaseCookies: vi.fn(),
}));

vi.mock('../../../src/store/user', () => ({
    setUser: vi.fn(),
    clearUser: vi.fn(),
}));

describe('auth-handler', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Setup JSDOM environment specifics
        delete (window as any).location;
        window.location = { pathname: '/mypage', href: '' } as any;
        document.body.innerHTML = '<div class="global-noti-dot" style="display:none"></div>';
    });

    it('initAuthHandler가 리스너들을 등록한다', () => {
        const addSpy = vi.spyOn(document, 'addEventListener');
        initAuthHandler();
        expect(supabase.auth.onAuthStateChange).toHaveBeenCalled();
        expect(addSpy).toHaveBeenCalledWith('astro:page-load', expect.any(Function));
    });

    it('로그아웃 시 clearUser를 호출하고 리다이렉트한다', () => {
        let authCallback: any;
        (supabase.auth.onAuthStateChange as any).mockImplementation((cb: any) => {
            authCallback = cb;
        });

        initAuthHandler();
        authCallback('SIGNED_OUT', null);

        expect(clearUser).toHaveBeenCalled();
        // /mypage는 보호된 페이지(publicPaths 아님)이므로 리다이렉트 발생
        expect(window.location.href).toBe('/login');
    });

    it('로그아웃 시 forceClearSupabaseCookies를 clearUser보다 먼저 호출한다', () => {
        let authCallback: any;
        (supabase.auth.onAuthStateChange as any).mockImplementation((cb: any) => {
            authCallback = cb;
        });
        const callOrder: string[] = [];
        (forceClearSupabaseCookies as any).mockImplementation(() => callOrder.push('forceClear'));
        (clearUser as any).mockImplementation(() => callOrder.push('clearUser'));

        initAuthHandler();
        authCallback('SIGNED_OUT', null);

        expect(forceClearSupabaseCookies).toHaveBeenCalled();
        expect(callOrder).toEqual(['forceClear', 'clearUser']);
    });

    it('로그인 성공 시 프로필을 동기화하고 스토어를 업데이트한다', async () => {
        const mockSession = {
            user: {
                id: 'user123',
                email: 'user@test.com',
                created_at: '2023-01-01',
                app_metadata: { provider: 'email' },
            },
        };
        const mockProfile = { id: 'user123', username: 'testuser', nickname: 'TestUser', is_admin: false };

        (supabase.from as any).mockReturnValue({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: mockProfile, error: null }),
        });

        // Trigger astro:page-load logic manually through the mock session
        // In a real test we'd dispatch the event, but here we can test the internal logic if exported,
        // or just rely on the event trigger. Since updateUserStore is private,
        // we'll rely on dispatchEvent if possible, or refactor to export it for testing.

        // For now, let's assume we test the effect of initAuthHandler's page-load listener
        initAuthHandler();
        (supabase.auth.getSession as any).mockResolvedValue({ data: { session: mockSession } });

        // Dispatch astro:page-load
        const event = new CustomEvent('astro:page-load');
        document.dispatchEvent(event);

        // Wait for async operations
        await new Promise((resolve) => setTimeout(resolve, 0));

        expect(setUser).toHaveBeenCalledWith(
            expect.objectContaining({
                id: 'user123',
                nickname: 'TestUser',
            }),
        );
    });

    it('is_admin 은 profiles.is_admin 단일 기준 — 이메일이 관리자 목록에 있어도 DB 값이 false 면 false 다 (Stage 1-A)', async () => {
        const mockSession = {
            user: {
                id: 'admin-by-email-only',
                email: 'admin@test.com', // 과거였다면 PUBLIC_ADMIN_EMAILS 매치로 admin 취급됐을 값
                created_at: '2023-01-01',
                app_metadata: { provider: 'email' },
            },
        };
        const mockProfile = { id: 'admin-by-email-only', username: 'notadmin', nickname: 'NotAdmin', is_admin: false };

        (supabase.from as any).mockReturnValue({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: mockProfile, error: null }),
            update: vi.fn().mockReturnThis(),
        });

        initAuthHandler();
        (supabase.auth.getSession as any).mockResolvedValue({ data: { session: mockSession } });
        document.dispatchEvent(new CustomEvent('astro:page-load'));
        await new Promise((resolve) => setTimeout(resolve, 0));

        expect(setUser).toHaveBeenCalledWith(expect.objectContaining({ is_admin: false }));
        // 더 이상 이메일 대조로 profiles.is_admin 을 승격 업데이트하지 않는다.
        const fromResult = (supabase.from as any)();
        expect(fromResult.update).not.toHaveBeenCalled();
    });

    it('is_admin 은 profiles.is_admin 이 true 면 이메일과 무관하게 true 다 (Stage 1-A, username 로그인 대비)', async () => {
        const mockSession = {
            user: {
                id: 'username-admin',
                email: 'someadmin@radsafety.invalid', // username 로그인 — 관리자 이메일 목록에 없음
                created_at: '2023-01-01',
                app_metadata: { provider: 'email' },
            },
        };
        const mockProfile = { id: 'username-admin', username: 'someadmin', is_admin: true };

        (supabase.from as any).mockReturnValue({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: mockProfile, error: null }),
        });

        initAuthHandler();
        (supabase.auth.getSession as any).mockResolvedValue({ data: { session: mockSession } });
        document.dispatchEvent(new CustomEvent('astro:page-load'));
        await new Promise((resolve) => setTimeout(resolve, 0));

        expect(setUser).toHaveBeenCalledWith(expect.objectContaining({ is_admin: true }));
    });

    it('프로필이 없을 경우 자가 치유(upsert)를 시도한다', async () => {
        const mockSession = { user: { id: 'new-uid', email: 'new@test.com' } };

        (supabase.from as any).mockReturnValue({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }), // No profile
            upsert: vi.fn().mockResolvedValue({ error: null }),
        });

        initAuthHandler();
        (supabase.auth.getSession as any).mockResolvedValue({ data: { session: mockSession } });
        document.dispatchEvent(new CustomEvent('astro:page-load'));

        await new Promise((resolve) => setTimeout(resolve, 0));

        expect(supabase.from).toHaveBeenCalledWith('profiles');
        // insert 가 아니라 upsert 여야 한다 — 운영 DB의 auth.users → profiles 자동생성
        // 트리거와 충돌하지 않기 위해(Stage B, .spec/src/lib/auth-handler.md 규칙 5).
        const { upsert } = (supabase.from as any)();
        expect(upsert).toHaveBeenCalledWith(expect.objectContaining({ id: 'new-uid' }), { onConflict: 'id' });
    });

    it('카카오 자가 치유는 nickname·login_email 을 비운다 (Stage B)', async () => {
        const mockSession = {
            user: {
                id: 'kakao-new-uid',
                email: 'kakao@test.com',
                app_metadata: { provider: 'kakao' },
                user_metadata: { full_name: '카카오닉네임' },
            },
        };

        (supabase.from as any).mockReturnValue({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
            upsert: vi.fn().mockResolvedValue({ error: null }),
        });

        initAuthHandler();
        (supabase.auth.getSession as any).mockResolvedValue({ data: { session: mockSession } });
        document.dispatchEvent(new CustomEvent('astro:page-load'));
        await new Promise((resolve) => setTimeout(resolve, 0));

        const { upsert } = (supabase.from as any)();
        expect(upsert).toHaveBeenCalledWith(
            expect.objectContaining({ id: 'kakao-new-uid', nickname: null, login_email: null }),
            { onConflict: 'id' },
        );
    });

    it('이메일(OTP) 자가 치유는 login_email 을 그대로 둔다 — 전환 전까지 유일한 로그인 식별자 (Stage B)', async () => {
        const mockSession = {
            user: {
                id: 'otp-new-uid',
                email: 'otp@test.com',
                app_metadata: { provider: 'email' },
            },
        };

        (supabase.from as any).mockReturnValue({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
            upsert: vi.fn().mockResolvedValue({ error: null }),
        });

        initAuthHandler();
        (supabase.auth.getSession as any).mockResolvedValue({ data: { session: mockSession } });
        document.dispatchEvent(new CustomEvent('astro:page-load'));
        await new Promise((resolve) => setTimeout(resolve, 0));

        const { upsert } = (supabase.from as any)();
        expect(upsert).toHaveBeenCalledWith(
            expect.objectContaining({ id: 'otp-new-uid', login_email: 'otp@test.com' }),
            { onConflict: 'id' },
        );
    });

    describe('Stage B — 아이디 정하기 강제 게이트', () => {
        it('username 이 없으면 현재 경로와 무관하게 /claim-username 으로 보낸다', async () => {
            window.location = { pathname: '/resources', href: '' } as any;
            const mockSession = { user: { id: 'no-username-uid', email: 'user@test.com' } };
            const mockProfile = { id: 'no-username-uid', username: null, is_admin: false };

            (supabase.from as any).mockReturnValue({
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                maybeSingle: vi.fn().mockResolvedValue({ data: mockProfile, error: null }),
            });

            initAuthHandler();
            (supabase.auth.getSession as any).mockResolvedValue({ data: { session: mockSession } });
            document.dispatchEvent(new CustomEvent('astro:page-load'));
            await new Promise((resolve) => setTimeout(resolve, 0));

            expect(window.location.href).toBe('/claim-username');
        });

        it('이미 /claim-username 에 있으면 리다이렉트하지 않는다(무한루프 방지)', async () => {
            window.location = { pathname: '/claim-username', href: '' } as any;
            const mockSession = { user: { id: 'no-username-uid', email: 'user@test.com' } };
            const mockProfile = { id: 'no-username-uid', username: null, is_admin: false };

            (supabase.from as any).mockReturnValue({
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                maybeSingle: vi.fn().mockResolvedValue({ data: mockProfile, error: null }),
            });

            initAuthHandler();
            (supabase.auth.getSession as any).mockResolvedValue({ data: { session: mockSession } });
            document.dispatchEvent(new CustomEvent('astro:page-load'));
            await new Promise((resolve) => setTimeout(resolve, 0));

            expect(window.location.href).toBe('');
        });

        it('username 이 있으면 게이트가 발동하지 않는다', async () => {
            window.location = { pathname: '/resources', href: '' } as any;
            const mockSession = { user: { id: 'has-username-uid', email: 'user@test.com' } };
            const mockProfile = { id: 'has-username-uid', username: 'gildong', is_admin: false };

            (supabase.from as any).mockReturnValue({
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                maybeSingle: vi.fn().mockResolvedValue({ data: mockProfile, error: null }),
            });

            initAuthHandler();
            (supabase.auth.getSession as any).mockResolvedValue({ data: { session: mockSession } });
            document.dispatchEvent(new CustomEvent('astro:page-load'));
            await new Promise((resolve) => setTimeout(resolve, 0));

            expect(window.location.href).toBe('');
        });
    });
});
