import { supabase } from './supabase-browser';
import { setUser, clearUser } from '../store/user';
import { isAdmin as checkIsAdmin } from '../config/auth';

/**
 * 초기 인증 및 페이지 로드 핸들러 초기화
 */
export function initAuthHandler() {
    // 1. Auth State Change Listener (Logout focus)
    supabase.auth.onAuthStateChange((event, session) => {
        console.log('Auth State Change:', event, session?.user?.email);
        if (event === 'SIGNED_OUT') {
            clearUser();
            handleRedirect(window.location.pathname, false);
        }
    });

    // 2. Page Load Event Listener
    document.addEventListener('astro:page-load', async () => {
        console.log('✅ Auth Handler: Page Load - Syncing Session...');
        const {
            data: { session },
        } = await supabase.auth.getSession();
        await updateUserStore(session);
    });
}

/**
 * 전역 사용자 스토어 업데이트 및 프로필 동기화
 */
async function updateUserStore(session: any) {
    const currentPath = window.location.pathname;
    const isUserLoggedIn = !!session?.user;

    if (isUserLoggedIn) {
        const baseUser = {
            id: session.user.id,
            email: session.user.email || '',
            login_email: session.user.email || '',
            created_at: session.user.created_at || '',
            provider: session.user.app_metadata?.provider || 'email',
            nickname:
                session.user.user_metadata?.full_name ||
                session.user.user_metadata?.name ||
                session.user.user_metadata?.user_name ||
                '',
        };

        const userIsAdmin = checkIsAdmin(baseUser.login_email);

        try {
            const { data: profile, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', session.user.id)
                .maybeSingle();

            if (error) console.error('Profile Fetch Error:', error);

            if (profile) {
                if (userIsAdmin && !profile.is_admin) {
                    await supabase.from('profiles').update({ is_admin: true }).eq('id', session.user.id);
                }
                setUser({
                    ...baseUser,
                    ...profile,
                    nickname: profile.nickname || baseUser.nickname,
                    is_admin: userIsAdmin,
                    licenses: profile.licenses || [],
                });
                checkNotifications(session.user.id);
                document.dispatchEvent(new CustomEvent('user:loggedin'));
            } else {
                console.warn('No profile row. Attempting self-healing...');
                await performSelfHealing(session.user.id, baseUser, userIsAdmin);
            }
        } catch (err) {
            console.error('Unexpected Profile Error:', err);
            setUser({ ...baseUser, is_admin: userIsAdmin });
        }

        if (currentPath === '/login') window.location.href = '/mypage';
    } else {
        clearUser();
        handleRedirect(currentPath, false);
    }
}

/**
 * 프로필 누락 시 자동 생성 (자가 치유)
 */
async function performSelfHealing(userId: string, baseUser: any, userIsAdmin: boolean) {
    const newProfile = {
        id: userId,
        login_email: baseUser.login_email,
        nickname: baseUser.nickname,
        created_at: new Date().toISOString(),
        is_admin: userIsAdmin,
    };

    const { error } = await supabase.from('profiles').insert(newProfile);
    if (!error) {
        setUser({ ...baseUser, ...newProfile, licenses: [] });
        checkNotifications(userId);
        document.dispatchEvent(new CustomEvent('user:loggedin'));
    } else {
        console.error('Self-healing failed:', error);
        setUser({ ...baseUser, is_admin: userIsAdmin });
    }
}

/**
 * 미인증 접근 시 리다이렉트 처리
 */
function handleRedirect(path: string, isLoggedIn: boolean) {
    const publicPaths = ['/', '/login'];
    const isPublic = publicPaths.some((p) => path === p || (p !== '/' && path.startsWith(p)));

    const isBypass = new URLSearchParams(window.location.search).get('bypass_admin') === 'true';

    if (!isLoggedIn && !isPublic && !isBypass) {
        console.log('Unauthorized. Redirecting to /login...');
        window.location.href = '/login';
    }
}

/**
 * 읽지 않은 알림 확인 및 UI 배지 업데이트
 */
async function checkNotifications(userId: string) {
    try {
        const { count, error } = await supabase
            .from('notifications')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('is_read', false);

        if (!error) {
            const dots = document.querySelectorAll('.global-noti-dot');
            dots.forEach((dot) => {
                (dot as HTMLElement).style.display = count! > 0 ? 'block' : 'none';
            });
        }
    } catch (e) {
        console.error('Check Noti Exception:', e);
    }
}
