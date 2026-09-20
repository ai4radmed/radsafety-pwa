import { supabase, forceClearSupabaseCookies } from './supabase-browser';
import { setUser, clearUser } from '../store/user';
import { saveLastRoute } from './last-route';
import { isPublicPath } from './public-paths';

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
            // signOut() 이 세션 쿠키 조각 일부를 못 지우는 경우가 있어 방어적으로
            // 직접 한 번 더 지운다(2026-09-16, .spec/src/lib/supabase-browser.md 참조).
            forceClearSupabaseCookies();
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
        // 2-2(2026-09-19): 세션의 이메일·닉네임은 스토어로 옮기지 않는다 — 앱은 실명·이메일을 갖지 않는다.
        const baseUser = {
            id: session.user.id,
            email: session.user.email || '',
            created_at: session.user.created_at || '',
            provider: session.user.app_metadata?.provider || 'email',
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
    // 이메일·닉네임 컬럼은 2-2(2026-09-19)에서 삭제됐다 — 신규 행에도 쓰지 않는다. provider 는
    // 계속 기록한다: 관리자가 다른 사용자의 로그인 방식을 보는 유일한 영속 경로
    // (profiles.provider, sql_query/migrate_add_profile_provider.sql).
    const isKakao = baseUser.provider === 'kakao';
    const newProfile = {
        id: userId,
        provider: isKakao ? 'kakao' : 'email',
        created_at: new Date().toISOString(),
        is_admin: false,
        // Phase 2 (2단계 개정 — 2계층+가입승인+제재) — 자가 치유는 오직 진짜 신규
        // 계정에서만 일어난다(기존 사용자는 이미 profiles 행이 있어 이 함수 자체가
        // 안 불림) — 그래서 여기서 만드는 행은 항상 관리자 승인 대기로 시작한다.
        // 기존(마이그레이션 이전) 사용자는 컬럼 기본값 'active'를 그대로 유지.
        status: 'pending',
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
    // 2계층(공개/회원) 목록은 src/lib/public-paths.ts 가 단일 권위 — 서버 미들웨어의 사용성
    // 집계(gate_blocked)도 같은 목록을 쓴다. 두 벌로 두면 한쪽만 고친 날 어긋난다.
    const isPublic = isPublicPath(path);

    const isBypass = new URLSearchParams(window.location.search).get('bypass_admin') === 'true';

    if (!isLoggedIn && !isPublic && !isBypass) {
        console.log('Unauthorized. Redirecting to /login...');
        // 회원 전용 메뉴에서 왔음을 로그인 페이지가 안내할 수 있도록 출처를 넘긴다.
        window.location.href = `/login?from=${encodeURIComponent(path)}`;
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
