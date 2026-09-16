import { supabase } from './supabase-browser';
import { setUser, clearUser } from '../store/user';
import { saveLastRoute } from './last-route';

// Stage B (privacy_redesign_plan.md 전환기간) — username 없는 계정은 어디를 가려 해도
// 먼저 여기부터 거쳐야 한다. 신규·기존 구분 없음(Dr. Ben 2026-09-16 결정: 배포 후 첫 접속
// 시 1회 강제 전환 + 화면 안내로 설명, 반복 알림·배너 인프라는 두지 않는다).
const CLAIM_USERNAME_PATH = '/claim-username';

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
        saveLastRoute();
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

        let username: string | null = null;

        try {
            const { data: profile, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', session.user.id)
                .maybeSingle();

            if (error) console.error('Profile Fetch Error:', error);

            if (profile) {
                username = profile.username || null;
                setUser({
                    ...baseUser,
                    ...profile,
                    nickname: profile.nickname || baseUser.nickname,
                    is_admin: !!profile.is_admin,
                    licenses: profile.licenses || [],
                });
                checkNotifications(session.user.id);
                document.dispatchEvent(new CustomEvent('user:loggedin'));
            } else {
                console.warn('No profile row. Attempting self-healing...');
                await performSelfHealing(session.user.id, baseUser);
            }
        } catch (err) {
            console.error('Unexpected Profile Error:', err);
            setUser({ ...baseUser, is_admin: false });
        }

        // Stage B — username 없으면 어디를 가려 했든 먼저 아이디 정하기로 보낸다.
        // self-healing 으로 막 생긴 계정(새 카카오 가입)도 username 이 없어 여기 걸린다.
        if (!username && currentPath !== CLAIM_USERNAME_PATH) {
            window.location.href = CLAIM_USERNAME_PATH;
            return;
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
async function performSelfHealing(userId: string, baseUser: any) {
    // Stage B — 카카오 신규가입은 nickname·login_email 을 애초에 안 남긴다
    // (privacy_redesign_plan.md 카카오 로그인 흐름: "콜백에서 nickname/email 복사만 제거").
    // 이메일 OTP 사용자는 login_email 이 지금 유일한 로그인 식별자라 그대로 둔다
    // (전환 전까지는 그대로 작동해야 하므로 — 마이그레이션 단계 B "기존 로그인: 그대로 작동").
    const isKakao = baseUser.provider === 'kakao';
    const newProfile = {
        id: userId,
        login_email: isKakao ? null : baseUser.login_email,
        nickname: isKakao ? null : baseUser.nickname,
        created_at: new Date().toISOString(),
        is_admin: false,
    };

    // upsert(onConflict:'id') — signUpWithUsername 과 같은 이유(운영 DB의 auth.users →
    // profiles 자동생성 트리거, .spec/src/actions/index.md 규칙 10). 여기서도 평범한
    // insert 를 쓰면 트리거가 먼저 만든 행과 충돌해 자가 치유가 조용히 실패할 수 있다.
    const { error } = await supabase.from('profiles').upsert(newProfile, { onConflict: 'id' });
    if (!error) {
        setUser({ ...baseUser, ...newProfile, licenses: [] });
        checkNotifications(userId);
        document.dispatchEvent(new CustomEvent('user:loggedin'));
    } else {
        console.error('Self-healing failed:', error);
        setUser({ ...baseUser, is_admin: false });
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
